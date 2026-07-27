import katex from "katex";

// CLAUDE.md: "Render all maths with KaTeX. Never show raw LaTeX to a user."
// Works in both server and client components (katex.renderToString is pure
// JS, no DOM required).
export function MathText({ latex, display = false }: { latex: string; display?: boolean }) {
  const html = katex.renderToString(latex, { throwOnError: false, displayMode: display });
  // eslint-disable-next-line react/no-danger
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}
