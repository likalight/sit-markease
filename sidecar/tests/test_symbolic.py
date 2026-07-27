"""M3 acceptance test: /math/equivalent (symbolic.equivalent) on 10 known pairs."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from symbolic import equivalent

# (a_latex, b_latex, expected) — expected is True/False/None (None = unparseable).
KNOWN_PAIRS = [
    (r"2 + 2", r"4", True),
    (r"x + y", r"y + x", True),
    (r"\frac{1}{2}", r"0.5", True),
    (r"(x+1)^2", r"x^2 + 2x + 1", True),
    (r"\sin(x)^2 + \cos(x)^2", r"1", True),
    (r"2x + 3", r"2x + 4", False),
    (r"x^2", r"x^3", False),
    (r"2 e^{x^2/2}", r"2e^{x^2/2}", True),
    (r"\ln(2)", r"\ln 2", True),
    (r"[[[unparseable latex (((", r"x", None),
]


def run():
    passed = 0
    for a, b, expected in KNOWN_PAIRS:
        result = equivalent(a, b)
        ok = result == expected
        passed += ok
        print(f"{'OK  ' if ok else 'FAIL'} equivalent({a!r}, {b!r}) = {result!r} (expected {expected!r})")
    print(f"\n{passed}/{len(KNOWN_PAIRS)} passed")
    return passed == len(KNOWN_PAIRS)


if __name__ == "__main__":
    success = run()
    sys.exit(0 if success else 1)
