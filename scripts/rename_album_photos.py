#!/usr/bin/env python3
"""
Rename exported school photos for AVE Studio bulk album upload.

Input:  amalia_01_nr2-i-gh-duca.jpg
        andrei_sabareanu_10_nr2-i-gh-duca.jpg

Output: amalia (01).jpg
        andrei sabareanu (10).jpg

The bulk upload admin groups files by stripping a trailing "(...)" suffix,
so "amalia (01).jpg" and "amalia (02).jpg" both land in the "Amalia" album.
"""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path


def parse_filename(stem: str, school_suffix: str) -> tuple[str, str] | None:
    """
    Parse 'name_01_nr2-i-gh-duca' or 'first_second_01_nr2-i-gh-duca'.
    Returns (display_name, number) or None if the pattern does not match.
    """
    suffix = f"_{school_suffix}"
    if not stem.endswith(suffix):
        return None

    body = stem[: -len(suffix)]
    match = re.match(r"^(.+)_(\d+)$", body)
    if not match:
        return None

    name_part, number = match.groups()
    display_name = name_part.replace("_", " ").strip()
    if not display_name:
        return None

    return display_name, number


def build_new_name(display_name: str, number: str, extension: str) -> str:
    return f"{display_name} ({number}){extension}"


def collect_renames(
    directory: Path,
    school_suffix: str,
    *,
    recursive: bool,
) -> list[tuple[Path, Path]]:
    pattern = "**/*" if recursive else "*"
    files = sorted(
        p
        for p in directory.glob(pattern)
        if p.is_file() and p.suffix.lower() in {".jpg", ".jpeg", ".png"}
    )

    renames: list[tuple[Path, Path]] = []
    skipped: list[tuple[Path, str]] = []

    for source in files:
        parsed = parse_filename(source.stem, school_suffix)
        if not parsed:
            skipped.append((source, "does not match expected pattern"))
            continue

        display_name, number = parsed
        target_name = build_new_name(display_name, number, source.suffix.lower())
        target = source.with_name(target_name)

        if source.resolve() == target.resolve():
            continue

        renames.append((source, target))

    if skipped:
        print(f"\nSkipped {len(skipped)} file(s):", file=sys.stderr)
        for path, reason in skipped[:20]:
            print(f"  {path.name}: {reason}", file=sys.stderr)
        if len(skipped) > 20:
            print(f"  ... and {len(skipped) - 20} more", file=sys.stderr)

    return renames


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Rename school export photos for client album bulk upload.",
    )
    parser.add_argument(
        "directory",
        nargs="?",
        type=Path,
        default=Path("."),
        help="Folder containing the exported photos (default: current directory)",
    )
    parser.add_argument(
        "--school-suffix",
        default="nr2-i-gh-duca",
        help='School segment to ignore (default: "nr2-i-gh-duca")',
    )
    parser.add_argument(
        "-r",
        "--recursive",
        action="store_true",
        help="Process subfolders as well",
    )
    parser.add_argument(
        "--execute",
        action="store_true",
        help="Apply renames (default is dry-run preview only)",
    )
    args = parser.parse_args()

    directory = args.directory.expanduser().resolve()
    if not directory.is_dir():
        print(f"Error: not a directory: {directory}", file=sys.stderr)
        return 1

    renames = collect_renames(
        directory,
        args.school_suffix,
        recursive=args.recursive,
    )

    if not renames:
        image_count = len(
            [
                p
                for p in (
                    directory.rglob("*") if args.recursive else directory.glob("*")
                )
                if p.is_file() and p.suffix.lower() in {".jpg", ".jpeg", ".png"}
            ]
        )
        print(f"No files to rename in: {directory}")
        if image_count:
            print(
                f"Found {image_count} image(s), but none matched "
                f'*_XX_{args.school_suffix}.jpg — check --school-suffix or filenames.'
            )
        else:
            print("No .jpg/.jpeg/.png files found. cd into the photos folder or pass its path.")
        return 0

    collisions: dict[Path, list[Path]] = {}
    for source, target in renames:
        collisions.setdefault(target, []).append(source)

    conflict_targets = {t: sources for t, sources in collisions.items() if len(sources) > 1}
    if conflict_targets:
        print("Error: multiple files would rename to the same target:", file=sys.stderr)
        for target, sources in conflict_targets.items():
            print(f"  {target.name} <-", file=sys.stderr)
            for source in sources:
                print(f"    {source.name}", file=sys.stderr)
        return 1

    existing_targets = [
        (source, target)
        for source, target in renames
        if target.exists() and source.resolve() != target.resolve()
    ]
    if existing_targets:
        print("Error: target filename already exists:", file=sys.stderr)
        for source, target in existing_targets[:20]:
            print(f"  {source.name} -> {target.name}", file=sys.stderr)
        return 1

    mode = "EXECUTE" if args.execute else "DRY-RUN"
    print(f"{mode}: {len(renames)} file(s)\n")

    for source, target in renames:
        print(f"  {source.name}")
        print(f"    -> {target.name}\n")

    if not args.execute:
        print("Dry-run only. Re-run with --execute to apply renames.")
        return 0

    for source, target in renames:
        source.rename(target)

    print(f"Renamed {len(renames)} file(s).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
