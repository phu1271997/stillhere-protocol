"""Hard character-count gate for the Explorer submission bundle.

Portal enforces cap-per-field silently truncates at cap+1 in some places.
This gate refuses to let the deliverables leave the repo overflowing.
"""
from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BUNDLE = ROOT / "deliverables" / "text"

CAPS = {
    "oneliner.txt": 180,
    "description.txt": 1000,
    "expected.txt": 500,
}


def main() -> int:
    bad = 0
    print("Explorer submission field lengths:")
    for name, cap in CAPS.items():
        path = BUNDLE / name
        body = path.read_text(encoding="utf-8")
        n = len(body)
        tag = "OK" if n <= cap else "OVER"
        marker = " " if n <= cap else "!"
        print(f"  {marker} {name:<20s} {n:>4d} / {cap:<4d} {tag}")
        if n > cap:
            bad += 1
    if bad:
        print(f"\n{bad} field(s) exceed the Portal cap — fix before submitting.")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
