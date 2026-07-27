"""S4 symbolic maths — §7.5 / §8.

`equivalent()` is real (M3 — verified against 10 known pairs, see
tests/test_symbolic.py). `verify_item()` is still a stub until M7, see
docs/STUBS.md.
"""

from sympy import simplify
from sympy.parsing.latex import parse_latex


def equivalent(a_latex: str, b_latex: str) -> bool | None:
    try:
        a, b = parse_latex(a_latex), parse_latex(b_latex)
        return bool(simplify(a - b) == 0)
    except Exception:
        return None  # unparseable — caller falls back to LLM judgement


def verify_item(prompt_latex: str, solution_latex: str) -> dict:
    """S7 verification gate (§7.8). Not implemented until M7 — stubbed so
    `/math/verify-item` responds rather than 404ing during earlier milestones."""
    return {"valid": False, "reason": "not implemented until M7", "method": "unverified"}
