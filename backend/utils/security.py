import base64
import hashlib
import hmac
import os
import time
from typing import Optional

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
    """Verify a password against a stored hash or legacy plaintext string.

    Supports legacy plaintext passwords (no prefix) for backward compatibility.
    Plaintext passwords should be migrated to PBKDF2 hashes in production.
    """
    if not stored.startswith("pbkdf2_sha256$"):
        return hmac.compare_digest(password, stored)

    _, iterations_b64, salt_b64, key_b64 = stored.split("$", 3)
    salt = base64.b64decode(salt_b64)
    expected_key = base64.b64decode(key_b64)
    actual_key = hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), salt, int(iterations_b64)
    )
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

    def is_allowed(self, key: str) -> bool:
        now = int(time.time())
        window_start = now - (now % self.window_seconds)
        requests = self._windows.get(key, [])
        # Keep only requests in the current window
        requests = [ts for ts in requests if ts >= window_start]
        if len(requests) >= self.max_requests:
            self._windows[key] = requests
            return False
        requests.append(now)
        self._windows[key] = requests
        return True

    def remaining(self, key: str) -> int:
        now = int(time.time())
        window_start = now - (now % self.window_seconds)
        requests = [ts for ts in self._windows.get(key, []) if ts >= window_start]
        return max(0, self.max_requests - len(requests))


# Global limiters (per-instance)
login_limiter = InMemoryRateLimiter(window_seconds=60, max_requests=5)
application_submit_limiter = InMemoryRateLimiter(window_seconds=60, max_requests=10)


def get_client_ip(request_headers: dict) -> str:
    """Best-effort client IP extraction from request headers."""
    forwarded = request_headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request_headers.get("x-real-ip", "unknown")
