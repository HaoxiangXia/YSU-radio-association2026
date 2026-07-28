import base64
import hashlib
import hmac
import os
import threading
import time

from starlette.requests import Request

PBKDF2_ITERATIONS = 100_000


def hash_password(password: str) -> str:
    """Hash a password using PBKDF2-HMAC-SHA256.

    The returned string follows the format:
    pbkdf2_sha256${iterations}${base64_salt}${base64_key}
    """
    salt = os.urandom(16)
    key = hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), salt, PBKDF2_ITERATIONS
    )
    return (
        f"pbkdf2_sha256${PBKDF2_ITERATIONS}"
        f"${base64.b64encode(salt).decode('utf-8')}"
        f"${base64.b64encode(key).decode('utf-8')}"
    )


def verify_password(password: str, stored: str) -> bool:
    """Verify a password against a stored PBKDF2-HMAC-SHA256 hash.

    Only hashes in the format produced by `hash_password` are accepted.
    """
    try:
        if not stored.startswith("pbkdf2_sha256$"):
            return False
        _, iterations_text, salt_b64, key_b64 = stored.split("$", 3)
        iterations = int(iterations_text)
        if iterations <= 0:
            return False
        salt = base64.b64decode(salt_b64, validate=True)
        expected_key = base64.b64decode(key_b64, validate=True)
        actual_key = hashlib.pbkdf2_hmac(
            "sha256", password.encode("utf-8"), salt, iterations
        )
    except (TypeError, ValueError):
        return False
    return hmac.compare_digest(expected_key, actual_key)


class InMemoryRateLimiter:
    """Simple fixed-window in-memory rate limiter.

    Not suitable for multi-process deployments; use a Redis-backed limiter
    for production scale.
    """

    def __init__(self, window_seconds: int = 60, max_requests: int = 10):
        self.window_seconds = window_seconds
        self.max_requests = max_requests
        self._windows: dict[str, list[int]] = {}
        self._lock = threading.Lock()

    def _active_requests(self, key: str, now: int) -> list[int]:
        window_start = now - (now % self.window_seconds)
        return [ts for ts in self._windows.get(key, []) if ts >= window_start]

    def is_allowed(self, key: str) -> bool:
        now = int(time.time())
        with self._lock:
            requests = self._active_requests(key, now)
            if len(requests) >= self.max_requests:
                self._windows[key] = requests
                return False
            requests.append(now)
            self._windows[key] = requests
            return True

    def is_blocked(self, key: str) -> bool:
        now = int(time.time())
        with self._lock:
            requests = self._active_requests(key, now)
            self._windows[key] = requests
            return len(requests) >= self.max_requests

    def record_failure(self, key: str) -> None:
        now = int(time.time())
        with self._lock:
            requests = self._active_requests(key, now)
            requests.append(now)
            self._windows[key] = requests

    def clear(self, key: str) -> None:
        with self._lock:
            self._windows.pop(key, None)

    def remaining(self, key: str) -> int:
        now = int(time.time())
        with self._lock:
            requests = self._active_requests(key, now)
            self._windows[key] = requests
            return max(0, self.max_requests - len(requests))


# Global limiters (per-instance)
login_limiter = InMemoryRateLimiter(window_seconds=60, max_requests=5)
application_submit_limiter = InMemoryRateLimiter(window_seconds=60, max_requests=10)
admission_query_limiter = InMemoryRateLimiter(window_seconds=60, max_requests=20)


def get_client_ip(request: Request) -> str:
    """Return the address already resolved by the trusted Uvicorn proxy setup."""
    return request.client.host if request.client else "unknown"
