/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    boxShadow: {
      xs: '0px 1px 2px 0px rgba(10, 13, 20, 0.03)',
      sm: '0px 1px 2px 0px #1018280F,0px 1px 3px 0px #1018281A',
      md: '0px 16px 32px -12px rgba(14, 18, 27, 0.10)',
      DEFAULT: '0px 16px 32px -12px #0E121B1A',
    },
    colors: {
      black: 'black',
      transparent: 'transparent',
      background: 'hsl(var(--background))',
      foreground: {
        0: 'hsl(var(--foreground-0))',
        50: 'hsl(var(--foreground-50))',
        100: 'hsl(var(--foreground-100))',
        200: 'hsl(var(--foreground-200))',
        300: 'hsl(var(--foreground-300))',
        400: 'hsl(var(--foreground-400))',
        500: 'hsl(var(--foreground-500))',
        600: 'hsl(var(--foreground-600))',
        700: 'hsl(var(--foreground-700))',
        800: 'hsl(var(--foreground-800))',
        900: 'hsl(var(--foreground-900))',
        950: 'hsl(var(--foreground-950))',
      },
      neutral: {
        DEFAULT: 'hsl(var(--neutral))',
        0: 'hsl(var(--neutral-0))',
        50: 'hsl(var(--neutral-50))',
        100: 'hsl(var(--neutral-100))',
        200: 'hsl(var(--neutral-200))',
        300: 'hsl(var(--neutral-300))',
        400: 'hsl(var(--neutral-400))',
        500: 'hsl(var(--neutral-500))',
        600: 'hsl(var(--neutral-600))',
        700: 'hsl(var(--neutral-700))',
        800: 'hsl(var(--neutral-800))',
        900: 'hsl(var(--neutral-900))',
        950: 'hsl(var(--neutral-950))',
        1000: 'hsl(var(--neutral-1000))',
        foreground: 'hsl(var(--neutral-foreground))',
      },
      'neutral-alpha': {
        50: 'hsl(var(--neutral-alpha-50))',
        100: 'hsl(var(--neutral-alpha-100))',
        200: 'hsl(var(--neutral-alpha-200))',
        300: 'hsl(var(--neutral-alpha-300))',
        400: 'hsl(var(--neutral-alpha-400))',
        500: 'hsl(var(--neutral-alpha-500))',
        600: 'hsl(var(--neutral-alpha-600))',
        700: 'hsl(var(--neutral-alpha-700))',
        800: 'hsl(var(--neutral-alpha-800))',
        900: 'hsl(var(--neutral-alpha-900))',
        950: 'hsl(var(--neutral-alpha-950))',
        1000: 'hsl(var(--neutral-alpha-1000))',
      },
      primary: {
        DEFAULT: 'hsl(var(--primary))',
        foreground: 'hsl(var(--primary-foreground))',
      },
      accent: {
        DEFAULT: 'hsl(var(--accent))',
      },
      destructive: {
        DEFAULT: 'hsl(var(--destructive))',
        foreground: 'hsl(var(--destructive-foreground))',
      },
      success: {
        DEFAULT: 'hsl(var(--success))',
      },
      warning: {
        DEFAULT: 'hsl(var(--warning))',
      },
      feature: {
        DEFAULT: 'hsl(var(--feature))',
      },
      information: {
        DEFAULT: 'hsl(var(--information))',
      },
      highlighted: {
        DEFAULT: 'hsl(var(--highlighted))',
      },
      stable: {
        DEFAULT: 'hsl(var(--stable))',
      },
      verified: {
        DEFAULT: 'hsl(var(--verified))',
      },
      alert: {
        DEFAULT: 'hsl(var(--alert))',
      },
      input: 'hsl(var(--input))',
      ring: 'hsl(var(--ring))',
    },
    extend: {
      fontFamily: {
        code: ['Ubuntu', 'monospace'],
      },
      opacity: {
        2.5: 0.025,
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        'pulse-shadow': {
          '0%': {
            boxShadow: '0 0 0 0 hsl(var(--pulse-color))',
          },
          '70%': {
            boxShadow: '0 0 0 6px rgba(255, 82, 82, 0)',
          },
          '100%': {
            boxShadow: '0 0 0 0 rgba(255, 82, 82, 0)',
          },
        },
        'accordion-down': {
          from: {
            height: '0',
          },
          to: {
            height: 'var(--radix-accordion-content-height)',
          },
        },
        'accordion-up': {
          from: {
            height: 'var(--radix-accordion-content-height)',
          },
          to: {
            height: '0',
          },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
