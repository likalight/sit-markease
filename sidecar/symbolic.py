"""S4/S7 symbolic maths — §7.5 / §7.8 / §8.

`equivalent()` is real (M3 — verified against 10 known pairs, see
tests/test_symbolic.py). `verify_item()` is real for the ODE-shaped
practice items this build's corpus generates (M7) — see docs/STUBS.md for
what it does and doesn't cover.
"""

import re

from sympy import E, diff, simplify, symbols
from sympy.parsing.latex import parse_latex

x, y = symbols("x y")


def _fix_euler(expr):
    """parse_latex treats a bare 'e' as a free symbol, not Euler's number —
    "2e^{x^2/2}" parses as 2 * (symbol e) ** (x^2/2), not 2 * E ** (x^2/2).
    In this build's domain (ODE solutions), a lone 'e' symbol is
    overwhelmingly intended as Euler's number, so substitute it in."""
    e_symbol = next((s for s in expr.free_symbols if s.name == "e"), None)
    return expr.subs(e_symbol, E) if e_symbol is not None else expr


def _parse_math(latex: str):
    return _fix_euler(parse_latex(latex))


def equivalent(a_latex: str, b_latex: str) -> bool | None:
    try:
        a, b = _parse_math(a_latex), _parse_math(b_latex)
        return bool(simplify(a - b) == 0)
    except Exception:
        return None  # unparseable — caller falls back to LLM judgement


_DERIVATIVE_EQ = re.compile(r"^\s*d\s*y\s*/\s*d\s*x\s*=\s*(.+)$")
_SOLUTION_EQ = re.compile(r"^\s*y\s*=\s*(.+)$")


def verify_item(prompt_latex: str, solution_latex: str) -> dict:
    """Verify a generated practice item shaped like a first-order ODE:
    prompt "dy/dx = f(x, y)", solution "y = g(x)". Substitutes the proposed
    solution into the ODE and checks it symbolically satisfies it —
    diff(g, x) == f(x, g). This is the domain this build's corpus generates
    items in (separable ODEs); it does not generalise to arbitrary practice
    items (systems, non-ODE algebra, etc.) — those fall through to the LLM
    judgement fallback the caller applies when this returns method='unparseable'.
    """
    prompt_match = _DERIVATIVE_EQ.match(prompt_latex.strip())
    solution_match = _SOLUTION_EQ.match(solution_latex.strip())
    if not prompt_match or not solution_match:
        return {
            "valid": False,
            "reason": "not a recognised dy/dx=... / y=... pair — falls back to LLM judgement",
            "method": "unparseable",
        }

    try:
        rhs_expr = _parse_math(prompt_match.group(1))
        solution_expr = _parse_math(solution_match.group(1))
    except Exception as e:
        return {"valid": False, "reason": f"could not parse: {e}", "method": "unparseable"}

    try:
        lhs = diff(solution_expr, x)
        rhs = rhs_expr.subs(y, solution_expr)
        holds = bool(simplify(lhs - rhs) == 0)
        return {
            "valid": holds,
            "reason": "dy/dx of the proposed solution matches f(x, y) after substitution" if holds
            else "the proposed solution does not satisfy the stated ODE",
            "method": "sympy",
        }
    except Exception as e:
        return {"valid": False, "reason": f"substitution/verification failed: {e}", "method": "unparseable"}
