/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    boxShadow: {
      xs: '0px 1px 2px 0px #0A0D1408',
      sm: '0px 1px 2px 0px #1018280F,0px 1px 3px 0px #1018281A',
      DEFAULT: '0px 16px 32px -12px #0E121B1A',
    },
    colors: {
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
        DEFAULT: 'hsl(var(--secondary))',
        0: 'hsl(var(--secondary-0))',
        50: 'hsl(var(--secondary-50))',
        100: 'hsl(var(--secondary-100))',
        200: 'hsl(var(--secondary-200))',
        300: 'hsl(var(--secondary-300))',
        400: 'hsl(var(--secondary-400))',
        500: 'hsl(var(--secondary-500))',
        600: 'hsl(var(--secondary-600))',
        700: 'hsl(var(--secondary-700))',
        800: 'hsl(var(--secondary-800))',
        900: 'hsl(var(--secondary-900))',
        950: 'hsl(var(--secondary-950))',
        1000: 'hsl(var(--secondary-1000))',
        foreground: 'hsl(var(--secondary-foreground))',
      },
      'secondary-alpha': {
        50: 'hsl(var(--secondary-alpha-50))',
        100: 'hsl(var(--secondary-alpha-100))',
        200: 'hsl(var(--secondary-alpha-200))',
        300: 'hsl(var(--secondary-alpha-300))',
        400: 'hsl(var(--secondary-alpha-400))',
        500: 'hsl(var(--secondary-alpha-500))',
        600: 'hsl(var(--secondary-alpha-600))',
        700: 'hsl(var(--secondary-alpha-700))',
        800: 'hsl(var(--secondary-alpha-800))',
        900: 'hsl(var(--secondary-alpha-900))',
        950: 'hsl(var(--secondary-alpha-950))',
        1000: 'hsl(var(--secondary-alpha-1000))',
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
      border: {
        DEFAULT: 'hsl(var(--border))',
        stroke: 'hsl(var(--stroke))',
      },
      input: 'hsl(var(--input))',
      ring: 'hsl(var(--ring))',
    },
    extend: {
      opacity: {
        2.5: 0.025,
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
