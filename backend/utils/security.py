import hmac
import threading
import time

from starlette.requests import Request


def verify_password(password: str, stored: str) -> bool:
    """Verify a password against the stored plaintext password."""
    return hmac.compare_digest(password.encode("utf-8"), stored.encode("utf-8"))


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
