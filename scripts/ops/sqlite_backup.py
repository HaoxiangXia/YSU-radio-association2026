#!/usr/bin/env python3
"""Consistent SQLite backup, verification, and offline restore helpers."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import sqlite3
import sys
from contextlib import closing
from datetime import datetime, timezone
from pathlib import Path


def connect_readonly(path: Path) -> sqlite3.Connection:
    if not path.is_file():
        raise FileNotFoundError(f"SQLite 文件不存在：{path}")
    return sqlite3.connect(
        f"{path.resolve().as_uri()}?mode=ro",
        uri=True,
        timeout=30,
    )


def quick_check(path: Path) -> None:
    with closing(connect_readonly(path)) as connection:
        result = connection.execute("PRAGMA quick_check").fetchone()
    if not result or result[0] != "ok":
        detail = result[0] if result else "无结果"
        raise RuntimeError(f"SQLite 完整性检查失败：{detail}")


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def write_atomic(path: Path, content: str, mode: int = 0o640) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_name(f".{path.name}.{os.getpid()}.tmp")
    try:
        with temporary.open("x", encoding="utf-8", newline="\n") as output:
            output.write(content)
        os.chmod(temporary, mode)
        os.replace(temporary, path)
    finally:
        temporary.unlink(missing_ok=True)


def remove_sqlite_sidecars(path: Path) -> None:
    for suffix in ("-wal", "-shm"):
        path.with_name(f"{path.name}{suffix}").unlink(missing_ok=True)


def backup_database(source: Path, destination: Path) -> str:
    source = source.resolve()
    destination = destination.resolve()
    if source == destination:
        raise ValueError("备份源和目标不能相同")
    if destination.exists():
        raise FileExistsError(f"备份目标已存在：{destination}")

    destination.parent.mkdir(parents=True, exist_ok=True)
    temporary = destination.with_name(f".{destination.name}.{os.getpid()}.tmp")
    if temporary.exists():
        raise FileExistsError(f"临时备份目标已存在：{temporary}")

    try:
        with closing(connect_readonly(source)) as source_connection:
            with closing(sqlite3.connect(temporary)) as backup_connection:
                source_connection.backup(backup_connection)
        os.chmod(temporary, 0o640)
        quick_check(temporary)
        os.replace(temporary, destination)
    finally:
        temporary.unlink(missing_ok=True)
        remove_sqlite_sidecars(temporary)

    checksum = sha256_file(destination)
    write_atomic(
        destination.with_suffix(f"{destination.suffix}.sha256"),
        f"{checksum}  {destination.name}\n",
    )
    return checksum


def verify_checksum(path: Path) -> str:
    checksum_path = path.with_suffix(f"{path.suffix}.sha256")
    fields = checksum_path.read_text(encoding="utf-8").split()
    if not fields or len(fields[0]) != 64:
        raise RuntimeError("SQLite 备份校验文件格式无效")
    expected = fields[0].lower()
    actual = sha256_file(path)
    if expected != actual:
        raise RuntimeError("SQLite 备份校验和不匹配")
    quick_check(path)
    return actual


def restore_database(source: Path, destination: Path, safety_directory: Path) -> tuple[Path | None, str]:
    source = source.resolve()
    destination = destination.resolve()
    verify_checksum(source)

    safety_backup = None
    if destination.exists():
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
        safety_backup = safety_directory.resolve() / f"pre-restore-{timestamp}.sqlite"
        backup_database(destination, safety_backup)

    destination.parent.mkdir(parents=True, exist_ok=True)
    temporary = destination.with_name(f".{destination.name}.restore.{os.getpid()}.tmp")
    try:
        with closing(connect_readonly(source)) as source_connection:
            with closing(sqlite3.connect(temporary)) as destination_connection:
                source_connection.backup(destination_connection)
        os.chmod(temporary, 0o640)
        quick_check(temporary)
        os.replace(temporary, destination)
        destination.with_name(f"{destination.name}-wal").unlink(missing_ok=True)
        destination.with_name(f"{destination.name}-shm").unlink(missing_ok=True)
    finally:
        temporary.unlink(missing_ok=True)
        remove_sqlite_sidecars(temporary)

    return safety_backup, sha256_file(destination)


def write_status(path: Path, backup_path: Path, checksum: str, oss_uri: str = "") -> None:
    payload = {
        "ok": True,
        "completedAt": datetime.now(timezone.utc).isoformat(),
        "backupFile": backup_path.name,
        "sha256": checksum,
        "ossUri": oss_uri,
    }
    write_atomic(path.resolve(), f"{json.dumps(payload, ensure_ascii=False, indent=2)}\n")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser()
    subparsers = parser.add_subparsers(dest="command", required=True)

    backup = subparsers.add_parser("backup")
    backup.add_argument("source", type=Path)
    backup.add_argument("destination", type=Path)

    verify = subparsers.add_parser("verify")
    verify.add_argument("path", type=Path)

    restore = subparsers.add_parser("restore")
    restore.add_argument("source", type=Path)
    restore.add_argument("destination", type=Path)
    restore.add_argument("safety_directory", type=Path)

    status_parser = subparsers.add_parser("status")
    status_parser.add_argument("path", type=Path)
    status_parser.add_argument("backup", type=Path)
    status_parser.add_argument("checksum")
    status_parser.add_argument("--oss-uri", default="")
    return parser


def main() -> int:
    args = build_parser().parse_args()
    try:
        if args.command == "backup":
            print(backup_database(args.source, args.destination))
        elif args.command == "verify":
            print(verify_checksum(args.path))
        elif args.command == "restore":
            safety_backup, checksum = restore_database(
                args.source,
                args.destination,
                args.safety_directory,
            )
            print(json.dumps({
                "safetyBackup": str(safety_backup) if safety_backup else None,
                "sha256": checksum,
            }))
        else:
            write_status(
                args.path,
                args.backup,
                args.checksum,
                args.oss_uri,
            )
    except (FileNotFoundError, FileExistsError, OSError, RuntimeError, sqlite3.Error, ValueError) as exc:
        print(f"错误：{exc}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
