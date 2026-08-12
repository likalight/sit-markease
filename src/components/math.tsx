import katex from "katex";

// CLAUDE.md: "Render all maths with KaTeX. Never show raw LaTeX to a user."
// Works in both server and client components (katex.renderToString is pure
// JS, no DOM required).
//
// Two shapes of input reach this component: pure math (transcribed steps —
// the whole string IS the expression, e.g. "x^2 + 1") and mixed prose with
// inline math delimited by \( \) or $ $ (LLM-generated practice-item
// prompts/solutions, e.g. "Linear momentum \( p \) is defined as..."). Only
// splitting on delimiters when they're actually present preserves the pure
// -math case exactly as before; without this split, mixed content fed
// whole into katex.renderToString produced literal, unrendered "\( p \)"
// error text and ran plain words together (KaTeX drops bare spaces in math
// mode) — a real instance of the raw-LaTeX-to-the-user bug the rule above
// exists to prevent.
const DELIMITER = /\\\(([\s\S]+?)\\\)|\\\[([\s\S]+?)\\\]|\$\$([\s\S]+?)\$\$|\$([^$]+?)\$/g;

// A third shape reaches this component alongside the two the delimiter
// split handles: pure natural-language prose with no math in it at all
// (an LLM-generated practice prompt like "Define linear momentum and
// provide the formula used to calculate it."). With no delimiters present
// this used to fall into the pure-math branch and get handed whole to
// KaTeX, which drops the spaces between ordinary words (each becomes an
// adjacent italic variable) — same visible failure as the bug the
// delimiter split above was written to fix, just with zero delimiters
// instead of unescaped ones. Heuristic: several real English words and no
// LaTeX command means prose, not math.
function looksLikeProse(text: string): boolean {
  if (/\\[a-zA-Z]/.test(text)) return false;
  const words = text.trim().split(/\s+/).filter((w) => /^[A-Za-z][A-Za-z'-]*$/.test(w));
  return words.length >= 4;
}

export function MathText({ latex, display = false }: { latex: string; display?: boolean }) {
  if (!DELIMITER.test(latex)) {
    if (looksLikeProse(latex)) return <span>{latex}</span>;
    const html = katex.renderToString(latex, { throwOnError: false, displayMode: display });
    // eslint-disable-next-line react/no-danger
    return <span dangerouslySetInnerHTML={{ __html: html }} />;
  }

  DELIMITER.lastIndex = 0;
  const parts: { text?: string; math?: string }[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = DELIMITER.exec(latex))) {
    if (match.index > lastIndex) parts.push({ text: latex.slice(lastIndex, match.index) });
    parts.push({ math: match[1] ?? match[2] ?? match[3] ?? match[4] });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < latex.length) parts.push({ text: latex.slice(lastIndex) });

  return (
    <span>
      {parts.map((part, i) =>
        part.math !== undefined ? (
          <span
            key={i}
            // eslint-disable-next-line react/no-danger
            dangerouslySetInnerHTML={{
              __html: katex.renderToString(part.math, { throwOnError: false, displayMode: false }),
            }}
          />
        ) : (
          <span key={i}>{part.text}</span>
        )
      )}
    </span>
  );
}
