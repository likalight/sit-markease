import type { Config } from "tailwindcss";

// Maps docs/DESIGN.md §1 tokens (shipped as CSS custom properties in
// globals.css) onto the Tailwind theme. Never inline a hex value in a
// component — use these utilities (bg-canvas, text-verified, etc.).
export default {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "var(--color-canvas)",
        "surface-soft": "var(--color-surface-soft)",
        "surface-card": "var(--color-surface-card)",
        "surface-strong": "var(--color-surface-strong)",
        "surface-dark": "var(--color-surface-dark)",
        "surface-dark-elevated": "var(--color-surface-dark-elevated)",
        "surface-dark-soft": "var(--color-surface-dark-soft)",

        ink: "var(--color-ink)",
        body: "var(--color-body)",
        "body-strong": "var(--color-body-strong)",
        muted: "var(--color-muted)",
        "muted-soft": "var(--color-muted-soft)",
        hairline: "var(--color-hairline)",
        "hairline-soft": "var(--color-hairline-soft)",
        "on-dark": "var(--color-on-dark)",
        "on-dark-soft": "var(--color-on-dark-soft)",

        primary: {
          DEFAULT: "var(--color-primary)",
          active: "var(--color-primary-active)",
          soft: "var(--color-primary-soft)",
          hairline: "var(--color-primary-hairline)",
        },
        "on-primary": "var(--color-on-primary)",

        verified: { DEFAULT: "var(--color-verified)", soft: "var(--color-verified-soft)" },
        attention: { DEFAULT: "var(--color-attention)", soft: "var(--color-attention-soft)" },
        disputed: { DEFAULT: "var(--color-disputed)", soft: "var(--color-disputed-soft)" },
        "neutral-low": "var(--color-neutral-low)",
      },
      fontFamily: {
        // NOTE: the `serif` key is a naming holdover from design-system v1.
        // --font-serif now loads Space Grotesk (bold/geometric), not a serif
        // — kept as-is rather than renaming across every component that
        // already uses `font-serif` for display headlines.
        serif: ["var(--font-serif)", "system-ui", "sans-serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      fontSize: {
        "display-xl": ["56px", { lineHeight: "1.05", letterSpacing: "-1.2px" }],
        "display-lg": ["40px", { lineHeight: "1.1", letterSpacing: "-0.8px" }],
        "display-md": ["30px", { lineHeight: "1.15", letterSpacing: "-0.5px" }],
        "display-sm": ["24px", { lineHeight: "1.2", letterSpacing: "-0.3px" }],
        "title-lg": ["20px", { lineHeight: "1.3" }],
        "title-md": ["17px", { lineHeight: "1.4" }],
        "title-sm": ["15px", { lineHeight: "1.4" }],
        "body-md": ["15px", { lineHeight: "1.55" }],
        "body-sm": ["13.5px", { lineHeight: "1.55" }],
        caption: ["12.5px", { lineHeight: "1.4" }],
        "caption-caps": ["11.5px", { lineHeight: "1.4", letterSpacing: "1.4px" }],
        "data-sm": ["12.5px", { lineHeight: "1.3" }],
      },
      spacing: {
        xxs: "4px",
        xs: "8px",
        sm: "12px",
        md: "16px",
        lg: "24px",
        xl: "32px",
        xxl: "48px",
        section: "80px",
      },
      borderRadius: {
        // Tighter than v1 — blockier, matching the squared-off SIT mark.
        xs: "2px",
        sm: "3px",
        md: "4px",
        lg: "6px",
        xl: "8px",
        pill: "9999px",
      },
      boxShadow: {
        flat: "none",
        raised: "0 1px 2px rgba(11,11,12,0.08)",
        overlay: "0 8px 24px rgba(11,11,12,0.18)",
      },
    },
  },
  plugins: [],
} satisfies Config;
