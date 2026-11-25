/** Atelier Săcelean design tokens (mirrors atelier-sacelean.ro). Colours come from CSS variables
 *  so light/dark themes switch without rebuilding classes. */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--a-bg)',
        surface: 'var(--a-surface)',
        surface2: 'var(--a-surface-2)',
        deep: 'var(--a-surface-deep)',
        ink: 'var(--a-ink)',
        soft: 'var(--a-ink-soft)',
        muted: 'var(--a-muted)',
        line: 'var(--a-line)',
        linestrong: 'var(--a-line-strong)',
        control: 'var(--a-control-line)',
        accent: 'var(--a-accent)',
        accentstrong: 'var(--a-accent-strong)',
        accenttint: 'var(--a-accent-tint)',
        onaccent: 'var(--a-on-accent)',
        sky: '#00aeef',
        navy: '#0f204b',
        ok: 'var(--a-ok)',
        okbg: 'var(--a-ok-bg)',
        okline: 'var(--a-ok-line)',
        warn: 'var(--a-warn)',
        warnbg: 'var(--a-warn-bg)',
        danger: 'var(--a-danger)',
        dangerbg: 'var(--a-danger-bg)',
        dangerline: 'var(--a-danger-line)',
      },
      fontFamily: {
        sans: ['Manrope', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        display: ['"Bricolage Grotesque"', 'Manrope', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
      borderRadius: {
        DEFAULT: '9px',
        md: '9px',
        lg: '12px',
        xl: '16px',
        '2xl': '20px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(15, 32, 75, 0.06), 0 4px 16px rgba(15, 32, 75, 0.04)',
        pop: '0 12px 40px rgba(15, 32, 75, 0.18)',
      },
    },
  },
  plugins: [],
};
