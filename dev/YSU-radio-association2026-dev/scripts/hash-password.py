#!/usr/bin/env python3
"""Generate a PBKDF2 hash for a recruitment-officer password.

Usage:
    python scripts/hash-password.py
    python scripts/hash-password.py 'your-password'
"""
import getpass
import os
import sys

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(REPO_ROOT, "backend"))

from utils.security import hash_password


def main():
    if len(sys.argv) > 1:
        password = sys.argv[1]
    else:
        password = getpass.getpass("输入要哈希的密码: ")
        confirm = getpass.getpass("再次输入确认: ")
        if password != confirm:
            print("两次输入不一致", file=sys.stderr)
            sys.exit(1)
    print(hash_password(password))


if __name__ == "__main__":
    main()
