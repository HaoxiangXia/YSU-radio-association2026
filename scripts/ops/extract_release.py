#!/usr/bin/env python3
"""Safely extract a locally built Git release archive."""

from __future__ import annotations

import argparse
import sys
import tarfile
from pathlib import Path, PurePosixPath


MAX_MEMBERS = 20_000
MAX_TOTAL_SIZE = 512 * 1024 * 1024


def validate_members(archive: tarfile.TarFile) -> list[tarfile.TarInfo]:
    members = archive.getmembers()
    if len(members) > MAX_MEMBERS:
        raise ValueError("发布归档文件数量异常")

    total_size = 0
    seen: set[str] = set()
    for member in members:
        member_path = PurePosixPath(member.name)
        if (
            member_path.is_absolute()
            or ".." in member_path.parts
            or not member_path.parts
        ):
            raise ValueError(f"发布归档包含不安全路径：{member.name}")
        if member.name in seen:
            raise ValueError(f"发布归档包含重复路径：{member.name}")
        seen.add(member.name)
        if not (member.isdir() or member.isfile()):
            raise ValueError(f"发布归档包含链接或特殊文件：{member.name}")
        total_size += member.size
        if total_size > MAX_TOTAL_SIZE:
            raise ValueError("发布归档解压后体积异常")
    return members


def extract_release(archive_path: Path, destination: Path) -> None:
    if not archive_path.is_file():
        raise FileNotFoundError(f"发布归档不存在：{archive_path}")
    if not destination.is_dir() or any(destination.iterdir()):
        raise ValueError("发布解压目标必须是已存在的空目录")

    with tarfile.open(archive_path, mode="r:gz") as archive:
        members = validate_members(archive)
        archive.extractall(destination, members=members)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("archive", type=Path)
    parser.add_argument("destination", type=Path)
    args = parser.parse_args()
    try:
        extract_release(args.archive.resolve(), args.destination.resolve())
    except (FileNotFoundError, OSError, tarfile.TarError, ValueError) as exc:
        print(f"错误：{exc}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
