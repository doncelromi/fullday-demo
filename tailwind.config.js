/** @type {import('tailwindcss').Config} */

// Tokens CSS con soporte de opacidad (bg-accent/10, border-warn/30…) vía color-mix
const tok = (v) => ({ opacityValue }) =>
  opacityValue === undefined || opacityValue === '1'
    ? `var(${v})`
    : `color-mix(in srgb, var(${v}) calc(${opacityValue} * 100%), transparent)`;

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: tok('--bg'),
        subtle: tok('--bg-soft'),
        card: tok('--card'),
        line: tok('--border'),
        'line-strong': tok('--border-strong'),
        ink: tok('--text'),
        ink2: tok('--text-2'),
        muted: tok('--muted'),
        accent: tok('--accent'),
        'accent-hover': tok('--accent-hover'),
        'accent-soft': tok('--accent-soft'),
        'accent-fg': tok('--accent-fg'),
        navy: tok('--navy'),
        'navy-deep': tok('--navy-deep'),
        'navy-soft': tok('--navy-soft'),
        ok: tok('--ok'),
        warn: tok('--warn'),
        danger: tok('--danger'),
        info: tok('--info'),
        gold: tok('--gold'),
        airbnb: tok('--airbnb'),
        booking: tok('--booking'),
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      borderRadius: { ctl: '10px', card: '12px', panel: '16px' },
      boxShadow: { sm: 'var(--shadow-sm)', md: 'var(--shadow-md)' },
      screens: { xs: '400px' },
    },
  },
  plugins: [],
};
