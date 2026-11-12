export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: 'var(--canvas)', soft: 'var(--soft)', panel: 'var(--panel)', panel2: 'var(--panel-2)', panel3: 'var(--panel-3)',
        sidebar: 'var(--sidebar)', ink: 'var(--ink)', ink2: 'var(--ink-2)', muted: 'var(--muted)',
        line: 'var(--line)', line2: 'var(--line-2)',
        brand: { DEFAULT: 'var(--brand)', 2: 'var(--brand-2)', ink: 'var(--brand-ink)', soft: 'var(--brand-soft)' },
        ok: 'var(--ok)', warn: 'var(--warn)', err: 'var(--err)',
      },
      boxShadow: { soft: 'var(--shadow)' },
      borderRadius: { '2.5xl': '1.25rem' },
    },
  },
  plugins: [],
}
