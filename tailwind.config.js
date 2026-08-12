/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Legacy short names (bg/surface/ink/…) are kept so older screens restyle without
        // a rewrite; they resolve to the same values as their cred* counterparts.
        bg: '#F6F6F4',
        surface: '#FFFFFF',
        surface2: '#F1F1EE',
        line: '#E4E4E0',
        ink: '#12131A',
        muted: '#5F6270',

        credbg: '#F6F6F4',
        credsurface: '#FFFFFF',
        credsunken: '#F1F1EE',
        credink: '#12131A',
        credmuted: '#5F6270',
        credsubtle: '#8A8D99',
        credline: '#E4E4E0',

        // Financial semantics, per the Financial Dashboard rules: money moving the right
        // way is green, the wrong way is red, and neither is ever the only signal.
        pos: '#16A34A',
        neg: '#DC2626',
        warn: '#D97706',
        info: '#2563EB',
        biz: '#4C5BD4',
        credgreen: '#16A34A',

        accent: '#2F5BEA',
        accentsoft: '#EEF2FE',
        accentline: '#D3DEFC',
      },

      /**
       * Seven steps instead of the 22 ad-hoc pixel values this app had grown. Nine of
       * those sat between 9px and 13.5px, which no one can tell apart — they only made
       * the hierarchy noisy.
       */
      fontSize: {
        micro: ['0.625rem', { lineHeight: '0.875rem', letterSpacing: '0.08em' }], // 10
        caption: ['0.719rem', { lineHeight: '1rem' }],                            // 11.5
        small: ['0.781rem', { lineHeight: '1.125rem' }],                          // 12.5
        body: ['0.875rem', { lineHeight: '1.25rem' }],                            // 14
        title: ['1.0625rem', { lineHeight: '1.375rem', letterSpacing: '-0.01em' }], // 17
        heading: ['1.375rem', { lineHeight: '1.625rem', letterSpacing: '-0.015em' }], // 22
        display: ['2.125rem', { lineHeight: '2.375rem', letterSpacing: '-0.025em' }], // 34
      },

      borderRadius: {
        card: '14px',
        sheet: '20px',
        pill: '999px',
      },

      // Layered and low-contrast: depth should be felt, not seen as a grey smear.
      boxShadow: {
        subtle: '0 1px 2px rgba(18,19,26,0.04), 0 1px 1px rgba(18,19,26,0.03)',
        card: '0 1px 3px rgba(18,19,26,0.05), 0 6px 16px -8px rgba(18,19,26,0.10)',
        lifted: '0 2px 6px rgba(18,19,26,0.06), 0 16px 32px -12px rgba(18,19,26,0.16)',
        sheet: '0 -8px 40px -12px rgba(18,19,26,0.22)',
      },

      fontFamily: {
        sans: ['var(--font-sans)', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
        credserif: ['Georgia', 'Cambria', 'Times New Roman', 'serif'],
      },

      keyframes: {
        sheetIn: { from: { transform: 'translateY(12px)', opacity: '0' }, to: { transform: 'translateY(0)', opacity: '1' } },
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
        springUp: {
          '0%': { transform: 'translateY(8px)', opacity: '0' },
          '60%': { transform: 'translateY(-1px)', opacity: '1' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        springScale: {
          '0%': { transform: 'scale(0.96)', opacity: '0' },
          '60%': { transform: 'scale(1.005)', opacity: '1' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        expandIn: {
          from: { opacity: '0', transform: 'translateY(-4px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        dropdownIn: {
          from: { opacity: '0', transform: 'scale(0.95) translateY(-4px)' },
          to: { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
      },
      animation: {
        sheetIn: 'sheetIn 220ms cubic-bezier(0.32, 0.72, 0, 1)',
        fadeIn: 'fadeIn 160ms ease-out',
        springUp: 'springUp 400ms cubic-bezier(0.32, 0.72, 0, 1) both',
        springScale: 'springScale 400ms cubic-bezier(0.32, 0.72, 0, 1) both',
        expandIn: 'expandIn 250ms cubic-bezier(0.32, 0.72, 0, 1) both',
        dropdownIn: 'dropdownIn 180ms cubic-bezier(0.32, 0.72, 0, 1) both',
      },
    },
  },
  plugins: [],
};
