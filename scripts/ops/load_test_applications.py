#!/usr/bin/env python3
"""Isolated concurrency test for the membership-application API.

This tool intentionally uses only the Python standard library so it can run on
the deployment host without installing packages. It must only target an
isolated test service and database.
"""

from __future__ import annotations

import argparse
import concurrent.futures
import http.cookiejar
import json
import math
import statistics
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
from collections import Counter, defaultdict
from dataclasses import asdict, dataclass
from ipaddress import ip_address


@dataclass
class RequestResult:
    status: int
    latency_ms: float
    error: str | None = None


def percentile(values: list[float], percent: float) -> float:
    if not values:
        return 0.0
    ordered = sorted(values)
    rank = (len(ordered) - 1) * percent / 100
    low = math.floor(rank)
    high = math.ceil(rank)
    if low == high:
        return ordered[low]
    return ordered[low] + (ordered[high] - ordered[low]) * (rank - low)


def request(
    url: str,
    *,
    method: str = "GET",
    payload: dict | None = None,
    headers: dict[str, str] | None = None,
    timeout: float,
    opener: urllib.request.OpenerDirector | None = None,
) -> tuple[int, bytes, dict[str, str]]:
    body = None if payload is None else json.dumps(payload).encode("utf-8")
    request_headers = {"Accept": "application/json"}
    if payload is not None:
        request_headers["Content-Type"] = "application/json"
    if headers:
        request_headers.update(headers)
    req = urllib.request.Request(
        url,
        data=body,
        method=method,
        headers=request_headers,
    )
    client = opener.open if opener else urllib.request.urlopen
    with client(req, timeout=timeout) as response:
        return response.status, response.read(), dict(response.headers.items())


def make_application(index: int) -> dict:
    return {
        "name": f"压测申请人{index:04d}",
        "studentId": f"202{index:09d}",
        "college": "信息科学与工程学院",
        "grade": "2026级",
        "phone": f"139{index:08d}",
        "email": f"loadtest-{index:04d}@example.test",
        "self_introduction": "这是隔离数据库中的并发压力测试资料，不属于真实申请人。",
        "expectation": "验证高峰提交时接口与数据库是否稳定。",
        "privacyAccepted": True,
    }


def benchmark_ip(index: int) -> str:
    # RFC 2544 benchmarking range (198.18.0.0/15), never a real public client.
    zero_based = index - 1
    return f"198.18.{zero_based // 254}.{zero_based % 254 + 1}"


def submit_one(base_url: str, index: int, timeout: float, gate: threading.Event) -> RequestResult:
    gate.wait()
    started = time.perf_counter()
    try:
        status, _, _ = request(
            f"{base_url}/api/membership-applications",
            method="POST",
            payload=make_application(index),
            headers={"X-Forwarded-For": benchmark_ip(index)},
            timeout=timeout,
        )
        return RequestResult(status, (time.perf_counter() - started) * 1000)
    except urllib.error.HTTPError as error:
        detail = error.read().decode("utf-8", errors="replace")[:300]
        return RequestResult(
            error.code,
            (time.perf_counter() - started) * 1000,
            detail,
        )
    except Exception as error:  # network and timeout details belong in the report
        return RequestResult(
            0,
            (time.perf_counter() - started) * 1000,
            f"{type(error).__name__}: {error}",
        )


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-url", required=True)
    parser.add_argument("--count", type=int, default=500)
    parser.add_argument("--username", required=True)
    parser.add_argument("--password", required=True)
    parser.add_argument("--timeout", type=float, default=20)
    parser.add_argument("--workers", type=int)
    args = parser.parse_args()

    if args.count < 1:
        parser.error("--count must be positive")
    workers = args.workers or args.count
    if workers < 1 or workers > args.count:
        parser.error("--workers must be between 1 and --count")

    base_url = args.base_url.rstrip("/")
    parsed_base_url = urllib.parse.urlparse(base_url)
    try:
        target_ip = ip_address(parsed_base_url.hostname or "")
    except ValueError:
        target_ip = None
    if parsed_base_url.scheme != "http" or not target_ip or not target_ip.is_loopback:
        parser.error(
            "--base-url must use HTTP on a loopback IP; run only against an isolated local container"
        )
    cookie_jar = http.cookiejar.CookieJar()
    officer = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cookie_jar))

    login_status, _, _ = request(
        f"{base_url}/api/recruitment-officers/login",
        method="POST",
        payload={"username": args.username, "password": args.password, "remember": False},
        timeout=args.timeout,
        opener=officer,
    )
    verify_status, _, _ = request(
        f"{base_url}/api/recruitment-officers/verify",
        timeout=args.timeout,
        opener=officer,
    )
    if login_status != 200 or verify_status != 200:
        raise RuntimeError(f"officer session failed: login={login_status}, verify={verify_status}")

    gate = threading.Event()
    writes_done = threading.Event()
    read_results: list[tuple[str, RequestResult]] = []

    read_paths = {
        "list": "/api/membership-applications?limit=1000",
        "stats": "/api/membership-applications/stats",
        "export": "/api/membership-applications/export.csv",
    }

    def read_during_peak() -> None:
        gate.wait()
        cycles = 0
        while not writes_done.is_set() or cycles < 1:
            for label, path in read_paths.items():
                started = time.perf_counter()
                try:
                    status, _, _ = request(
                        f"{base_url}{path}",
                        timeout=args.timeout,
                        opener=officer,
                    )
                    result = RequestResult(status, (time.perf_counter() - started) * 1000)
                except urllib.error.HTTPError as error:
                    result = RequestResult(
                        error.code,
                        (time.perf_counter() - started) * 1000,
                        error.read().decode("utf-8", errors="replace")[:300],
                    )
                except Exception as error:
                    result = RequestResult(
                        0,
                        (time.perf_counter() - started) * 1000,
                        f"{type(error).__name__}: {error}",
                    )
                read_results.append((label, result))
            cycles += 1

    reader = threading.Thread(target=read_during_peak, name="management-reader", daemon=True)
    reader.start()

    with concurrent.futures.ThreadPoolExecutor(max_workers=workers) as pool:
        futures = [
            pool.submit(submit_one, base_url, index, args.timeout, gate)
            for index in range(1, args.count + 1)
        ]
        started = time.perf_counter()
        gate.set()
        write_results = [future.result() for future in futures]
        wall_seconds = time.perf_counter() - started
        writes_done.set()
    reader.join(timeout=args.timeout * 4)

    final_status, final_body, _ = request(
        f"{base_url}/api/membership-applications?limit=1000",
        timeout=args.timeout,
        opener=officer,
    )
    stats_status, stats_body, _ = request(
        f"{base_url}/api/membership-applications/stats",
        timeout=args.timeout,
        opener=officer,
    )
    export_status, export_body, export_headers = request(
        f"{base_url}/api/membership-applications/export.csv",
        timeout=args.timeout,
        opener=officer,
    )
    export_count = int(
        next(
            (
                value
                for key, value in export_headers.items()
                if key.lower() == "x-export-count"
            ),
            "-1",
        )
    )

    final_data = json.loads(final_body)
    stats_data = json.loads(stats_body)
    status_counts = Counter(result.status for result in write_results)
    write_latencies = [result.latency_ms for result in write_results]
    read_groups: dict[str, list[RequestResult]] = defaultdict(list)
    for label, result in read_results:
        read_groups[label].append(result)

    report = {
        "target": base_url,
        "requested": args.count,
        "workers": workers,
        "write": {
            "status_counts": {str(key): value for key, value in sorted(status_counts.items())},
            "wall_seconds": round(wall_seconds, 4),
            "throughput_per_second": round(args.count / wall_seconds, 2),
            "latency_ms": {
                "min": round(min(write_latencies), 2),
                "mean": round(statistics.fmean(write_latencies), 2),
                "p50": round(percentile(write_latencies, 50), 2),
                "p95": round(percentile(write_latencies, 95), 2),
                "p99": round(percentile(write_latencies, 99), 2),
                "max": round(max(write_latencies), 2),
            },
            "errors": [asdict(result) for result in write_results if result.error][:20],
        },
        "concurrent_management_reads": {
            label: {
                "count": len(results),
                "status_counts": dict(Counter(result.status for result in results)),
                "latency_ms": {
                    "p50": round(percentile([result.latency_ms for result in results], 50), 2),
                    "p95": round(percentile([result.latency_ms for result in results], 95), 2),
                    "max": round(max(result.latency_ms for result in results), 2),
                },
                "errors": [asdict(result) for result in results if result.error][:10],
            }
            for label, results in read_groups.items()
        },
        "final_api_validation": {
            "list_status": final_status,
            "list_count": final_data["pagination"]["count"],
            "stats_status": stats_status,
            "stats_total": stats_data["total"],
            "export_status": export_status,
            "export_count_header": export_count,
            "export_rows_including_header": len(export_body.decode("utf-8-sig").splitlines()),
        },
    }

    expected_reads_ok = all(
        result.status == 200 for _, result in read_results
    )
    passed = (
        status_counts == Counter({201: args.count})
        and expected_reads_ok
        and final_status == stats_status == export_status == 200
        and final_data["pagination"]["count"] == args.count
        and stats_data["total"] == args.count
        and export_count == args.count
        and len(export_body.decode("utf-8-sig").splitlines()) == args.count + 1
    )
    report["passed"] = passed
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0 if passed else 1


if __name__ == "__main__":
    raise SystemExit(main())
