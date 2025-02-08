import animate from 'tailwindcss-animate';

export const borderRadii = {
  4: '.25rem',
  6: '.375rem',
  8: '.5rem',
  10: '.625rem',
  12: '.75rem',
  16: '1rem',
  20: '1.25rem',
  24: '1.5rem',
  full: '999px',
  lg: 'var(--radius)', // DEPRECATED
  md: 'calc(var(--radius) - 2px)', // DEPRECATED
  sm: 'calc(var(--radius) - 4px)', // DEPRECATED
};

export const texts = {
  'title-h1': [
    '3.5rem',
    {
      lineHeight: '4rem',
      letterSpacing: '-0.035em',
      fontWeight: '500',
    },
  ],
  'title-h2': [
    '3rem',
    {
      lineHeight: '3.5rem',
      letterSpacing: '-0.035em',
      fontWeight: '500',
    },
  ],
  'title-h3': [
    '2.5rem',
    {
      lineHeight: '3rem',
      letterSpacing: '-0.035em',
      fontWeight: '500',
    },
  ],
  'title-h4': [
    '2rem',
    {
      lineHeight: '2.5rem',
      letterSpacing: '-0.01em',
      fontWeight: '500',
    },
  ],
  'title-h5': [
    '1.5rem',
    {
      lineHeight: '2rem',
      letterSpacing: '0em',
      fontWeight: '500',
    },
  ],
  'title-h6': [
    '1.25rem',
    {
      lineHeight: '1.75rem',
      letterSpacing: '0em',
      fontWeight: '500',
    },
  ],
  'label-xl': [
    '1.5rem',
    {
      lineHeight: '2rem',
      letterSpacing: '-0.0225em',
      fontWeight: '500',
    },
  ],
  'label-lg': [
    '1.125rem',
    {
      lineHeight: '1.5rem',
      letterSpacing: '-0.0225em',
      fontWeight: '500',
    },
  ],
  'label-md': [
    '1rem',
    {
      lineHeight: '1.5rem',
      letterSpacing: '-0.011em',
      fontWeight: '500',
    },
  ],
  'label-sm': [
    '.875rem',
    {
      lineHeight: '1.25rem',
      letterSpacing: '-0.00525em',
      fontWeight: '500',
    },
  ],
  'label-xs': [
    '.75rem',
    {
      lineHeight: '1rem',
      letterSpacing: '0em',
      fontWeight: '500',
    },
  ],
  'paragraph-xl': [
    '1.5rem',
    {
      lineHeight: '2rem',
      letterSpacing: '-0.0225em',
      fontWeight: '400',
    },
  ],
  'paragraph-lg': [
    '1.125rem',
    {
      lineHeight: '1.5rem',
      letterSpacing: '-0.016875em',
      fontWeight: '400',
    },
  ],
  'paragraph-md': [
    '1rem',
    {
      lineHeight: '1.5rem',
      letterSpacing: '-0.011em',
      fontWeight: '400',
    },
  ],
  'paragraph-sm': [
    '.875rem',
    {
      lineHeight: '1.25rem',
      letterSpacing: '-0.00525em',
      fontWeight: '400',
    },
  ],
  'paragraph-xs': [
    '.75rem',
    {
      lineHeight: '1rem',
      letterSpacing: '0em',
      fontWeight: '400',
    },
  ],
  'paragraph-2xs': [
    '0.625rem',
    {
      lineHeight: '0.875rem',
      letterSpacing: '0em',
      fontWeight: '400',
    },
  ],
  'subheading-md': [
    '1rem',
    {
      lineHeight: '1.5rem',
      letterSpacing: '0.06em',
      fontWeight: '500',
    },
  ],
  'subheading-sm': [
    '.875rem',
    {
      lineHeight: '1.25rem',
      letterSpacing: '0.05em',
      fontWeight: '500',
    },
  ],
  'subheading-xs': [
    '.75rem',
    {
      lineHeight: '1rem',
      letterSpacing: '0.03em',
      fontWeight: '500',
    },
  ],
  'subheading-2xs': [
    '.6875rem',
    {
      lineHeight: '.75rem',
      letterSpacing: '0.01375em',
      fontWeight: '500',
    },
  ],
  'code-sm': [
    '0.75rem',
    {
      lineHeight: '1rem',
      letterSpacing: '-0.015em',
      fontWeight: '500',
    },
  ],
};

export const shadows = {
  xs: '0px 1px 2px 0px rgba(10, 13, 20, 0.03)',
  sm: '0px 1px 2px 0px #1018280F,0px 1px 3px 0px #1018281A',
  md: '0px 16px 32px -12px rgba(14, 18, 27, 0.10)',
  DEFAULT: '0px 16px 32px -12px #0E121B1A',
  'button-primary-focus': ['0 0 0 2px theme(colors.bg[white])', '0 0 0 4px hsl(var(--primary-alpha-10))'],
  'button-important-focus': ['0 0 0 2px theme(colors.bg[white])', '0 0 0 4px hsl(var(--neutral-alpha-16))'],
  'button-error-focus': ['0 0 0 2px theme(colors.bg[white])', '0 0 0 4px hsl(var(--red-alpha-10))'],
};

export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    boxShadow: {
      ...shadows,
    },

    colors: {
      white: {
        DEFAULT: '#fff',
        'alpha-24': 'hsl(var(--white-alpha-24))',
        'alpha-16': 'hsl(var(--white-alpha-16))',
        'alpha-10': 'hsl(var(--white-alpha-10))',
      },
      black: {
        DEFAULT: '#000',
        'alpha-24': 'hsl(var(--black-alpha-24))',
        'alpha-16': 'hsl(var(--black-alpha-16))',
        'alpha-10': 'hsl(var(--black-alpha-10))',
      },
      transparent: 'transparent',
      background: 'hsl(var(--background))',
      gray: {
        0: 'hsl(var(--gray-0))',
        50: 'hsl(var(--gray-50))',
        100: 'hsl(var(--gray-100))',
        200: 'hsl(var(--gray-200))',
        300: 'hsl(var(--gray-300))',
        400: 'hsl(var(--gray-400))',
        500: 'hsl(var(--gray-500))',
        600: 'hsl(var(--gray-600))',
        700: 'hsl(var(--gray-700))',
        800: 'hsl(var(--gray-800))',
        900: 'hsl(var(--gray-900))',
        950: 'hsl(var(--gray-950))',
        'alpha-24': 'hsl(var(--gray-alpha-24))',
        'alpha-16': 'hsl(var(--gray-alpha-16))',
        'alpha-10': 'hsl(var(--gray-alpha-10))',
      },
      blue: {
        50: 'hsl(var(--blue-50))',
        100: 'hsl(var(--blue-100))',
        200: 'hsl(var(--blue-200))',
        300: 'hsl(var(--blue-300))',
        400: 'hsl(var(--blue-400))',
        500: 'hsl(var(--blue-500))',
        600: 'hsl(var(--blue-600))',
        700: 'hsl(var(--blue-700))',
        800: 'hsl(var(--blue-800))',
        900: 'hsl(var(--blue-900))',
        950: 'hsl(var(--blue-950))',
        'alpha-24': 'hsl(var(--blue-alpha-24))',
        'alpha-16': 'hsl(var(--blue-alpha-16))',
        'alpha-10': 'hsl(var(--blue-alpha-10))',
      },
      orange: {
        50: 'hsl(var(--orange-50))',
        100: 'hsl(var(--orange-100))',
        200: 'hsl(var(--orange-200))',
        300: 'hsl(var(--orange-300))',
        400: 'hsl(var(--orange-400))',
        500: 'hsl(var(--orange-500))',
        600: 'hsl(var(--orange-600))',
        700: 'hsl(var(--orange-700))',
        800: 'hsl(var(--orange-800))',
        900: 'hsl(var(--orange-900))',
        950: 'hsl(var(--orange-950))',
        'alpha-24': 'hsl(var(--orange-alpha-24))',
        'alpha-16': 'hsl(var(--orange-alpha-16))',
        'alpha-10': 'hsl(var(--orange-alpha-10))',
      },
      red: {
        50: 'hsl(var(--red-50))',
        100: 'hsl(var(--red-100))',
        200: 'hsl(var(--red-200))',
        300: 'hsl(var(--red-300))',
        400: 'hsl(var(--red-400))',
        500: 'hsl(var(--red-500))',
        600: 'hsl(var(--red-600))',
        700: 'hsl(var(--red-700))',
        800: 'hsl(var(--red-800))',
        900: 'hsl(var(--red-900))',
        950: 'hsl(var(--red-950))',
        'alpha-24': 'hsl(var(--red-alpha-24))',
        'alpha-16': 'hsl(var(--red-alpha-16))',
        'alpha-10': 'hsl(var(--red-alpha-10))',
      },
      green: {
        50: 'hsl(var(--green-50))',
        100: 'hsl(var(--green-100))',
        200: 'hsl(var(--green-200))',
        300: 'hsl(var(--green-300))',
        400: 'hsl(var(--green-400))',
        500: 'hsl(var(--green-500))',
        600: 'hsl(var(--green-600))',
        700: 'hsl(var(--green-700))',
        800: 'hsl(var(--green-800))',
        900: 'hsl(var(--green-900))',
        950: 'hsl(var(--green-950))',
        'alpha-24': 'hsl(var(--green-alpha-24))',
        'alpha-16': 'hsl(var(--green-alpha-16))',
        'alpha-10': 'hsl(var(--green-alpha-10))',
      },
      yellow: {
        50: 'hsl(var(--yellow-50))',
        100: 'hsl(var(--yellow-100))',
        200: 'hsl(var(--yellow-200))',
        300: 'hsl(var(--yellow-300))',
        400: 'hsl(var(--yellow-400))',
        500: 'hsl(var(--yellow-500))',
        600: 'hsl(var(--yellow-600))',
        700: 'hsl(var(--yellow-700))',
        800: 'hsl(var(--yellow-800))',
        900: 'hsl(var(--yellow-900))',
        950: 'hsl(var(--yellow-950))',
        'alpha-24': 'hsl(var(--yellow-alpha-24))',
        'alpha-16': 'hsl(var(--yellow-alpha-16))',
        'alpha-10': 'hsl(var(--yellow-alpha-10))',
      },
      purple: {
        50: 'hsl(var(--purple-50))',
        100: 'hsl(var(--purple-100))',
        200: 'hsl(var(--purple-200))',
        300: 'hsl(var(--purple-300))',
        400: 'hsl(var(--purple-400))',
        500: 'hsl(var(--purple-500))',
        600: 'hsl(var(--purple-600))',
        700: 'hsl(var(--purple-700))',
        800: 'hsl(var(--purple-800))',
        900: 'hsl(var(--purple-900))',
        950: 'hsl(var(--purple-950))',
        'alpha-24': 'hsl(var(--purple-alpha-24))',
        'alpha-16': 'hsl(var(--purple-alpha-16))',
        'alpha-10': 'hsl(var(--purple-alpha-10))',
      },
      sky: {
        50: 'hsl(var(--sky-50))',
        100: 'hsl(var(--sky-100))',
        200: 'hsl(var(--sky-200))',
        300: 'hsl(var(--sky-300))',
        400: 'hsl(var(--sky-400))',
        500: 'hsl(var(--sky-500))',
        600: 'hsl(var(--sky-600))',
        700: 'hsl(var(--sky-700))',
        800: 'hsl(var(--sky-800))',
        900: 'hsl(var(--sky-900))',
        950: 'hsl(var(--sky-950))',
        'alpha-24': 'hsl(var(--sky-alpha-24))',
        'alpha-16': 'hsl(var(--sky-alpha-16))',
        'alpha-10': 'hsl(var(--sky-alpha-10))',
      },
      pink: {
        50: 'hsl(var(--pink-50))',
        100: 'hsl(var(--pink-100))',
        200: 'hsl(var(--pink-200))',
        300: 'hsl(var(--pink-300))',
        400: 'hsl(var(--pink-400))',
        500: 'hsl(var(--pink-500))',
        600: 'hsl(var(--pink-600))',
        700: 'hsl(var(--pink-700))',
        800: 'hsl(var(--pink-800))',
        900: 'hsl(var(--pink-900))',
        950: 'hsl(var(--pink-950))',
        'alpha-24': 'hsl(var(--pink-alpha-24))',
        'alpha-16': 'hsl(var(--pink-alpha-16))',
        'alpha-10': 'hsl(var(--pink-alpha-10))',
      },
      teal: {
        50: 'hsl(var(--teal-50))',
        100: 'hsl(var(--teal-100))',
        200: 'hsl(var(--teal-200))',
        300: 'hsl(var(--teal-300))',
        400: 'hsl(var(--teal-400))',
        500: 'hsl(var(--teal-500))',
        600: 'hsl(var(--teal-600))',
        700: 'hsl(var(--teal-700))',
        800: 'hsl(var(--teal-800))',
        900: 'hsl(var(--teal-900))',
        950: 'hsl(var(--teal-950))',
        'alpha-24': 'hsl(var(--teal-alpha-24))',
        'alpha-16': 'hsl(var(--teal-alpha-16))',
        'alpha-10': 'hsl(var(--teal-alpha-10))',
      },
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
        'alpha-24': 'hsl(var(--neutral-alpha-24))',
        'alpha-16': 'hsl(var(--neutral-alpha-16))',
        'alpha-10': 'hsl(var(--neutral-alpha-10))',
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
        dark: 'hsl(var(--primary-dark))',
        darker: 'hsl(var(--primary-darker))',
        base: 'hsl(var(--primary-base))',
        'alpha-24': 'hsl(var(--primary-alpha-24))',
        'alpha-16': 'hsl(var(--primary-alpha-16))',
        'alpha-10': 'hsl(var(--primary-alpha-10))',
        foreground: 'hsl(var(--primary-foreground))',
      },
      bg: {
        strong: 'hsl(var(--bg-strong))',
        surface: 'hsl(var(--bg-surface))',
        sub: 'hsl(var(--bg-sub))',
        soft: 'hsl(var(--bg-soft))',
        weak: 'hsl(var(--bg-weak))',
        white: 'hsl(var(--bg-white))',
      },
      stroke: {
        strong: 'hsl(var(--stroke-strong))',
        sub: 'hsl(var(--stroke-sub))',
        soft: 'hsl(var(--stroke-soft))',
        white: 'hsl(var(--stroke-white))',
      },
      text: {
        strong: 'hsl(var(--text-strong))',
        sub: 'hsl(var(--text-sub))',
        soft: 'hsl(var(--text-soft))',
        disabled: 'hsl(var(--text-disabled))',
        white: 'hsl(var(--text-white))',
      },
      faded: {
        dark: 'hsl(var(--faded-dark))',
        base: 'hsl(var(--faded-base))',
        light: 'hsl(var(--faded-light))',
        lighter: 'hsl(var(--faded-lighter))',
      },
      information: {
        DEFAULT: 'hsl(var(--information))',
        dark: 'hsl(var(--information-dark))',
        base: 'hsl(var(--information-base))',
        light: 'hsl(var(--information-light))',
        lighter: 'hsl(var(--information-lighter))',
      },
      static: {
        black: 'hsl(var(--static-black))',
        white: 'hsl(var(--static-white))',
      },
      accent: {
        DEFAULT: 'hsl(var(--accent))', // DEPRECATED
      },
      destructive: {
        DEFAULT: 'hsl(var(--destructive))', // DEPRECATED
        foreground: 'hsl(var(--destructive-foreground))', // DEPRECATED
      },
      success: {
        DEFAULT: 'hsl(var(--success))',
        dark: 'hsl(var(--success-dark))',
        base: 'hsl(var(--success-base))',
        light: 'hsl(var(--success-light))',
        lighter: 'hsl(var(--success-lighter))',
      },
      warning: {
        DEFAULT: 'hsl(var(--warning))',
        dark: 'hsl(var(--warning-dark))',
        base: 'hsl(var(--warning-base))',
        light: 'hsl(var(--warning-light))',
        lighter: 'hsl(var(--warning-lighter))',
      },
      away: {
        dark: 'hsl(var(--away-dark))',
        base: 'hsl(var(--away-base))',
        light: 'hsl(var(--away-light))',
        lighter: 'hsl(var(--away-lighter))',
      },
      error: {
        DEFAULT: 'hsl(var(--error))',
        dark: 'hsl(var(--error-dark))',
        base: 'hsl(var(--error-base))',
        light: 'hsl(var(--error-light))',
        lighter: 'hsl(var(--error-lighter))',
      },
      feature: {
        DEFAULT: 'hsl(var(--feature))',
        dark: 'hsl(var(--feature-dark))',
        base: 'hsl(var(--feature-base))',
        light: 'hsl(var(--feature-light))',
        lighter: 'hsl(var(--feature-lighter))',
      },

      highlighted: {
        DEFAULT: 'hsl(var(--highlighted))',
        dark: 'hsl(var(--highlighted-dark))',
        base: 'hsl(var(--highlighted-base))',
        light: 'hsl(var(--highlighted-light))',
        lighter: 'hsl(var(--highlighted-lighter))',
      },
      stable: {
        DEFAULT: 'hsl(var(--stable))',
        dark: 'hsl(var(--stable-dark))',
        base: 'hsl(var(--stable-base))',
        light: 'hsl(var(--stable-light))',
        lighter: 'hsl(var(--stable-lighter))',
      },
      verified: {
        DEFAULT: 'hsl(var(--verified))',
        dark: 'hsl(var(--verified-dark))',
        base: 'hsl(var(--verified-base))',
        light: 'hsl(var(--verified-light))',
        lighter: 'hsl(var(--verified-lighter))',
      },
      alert: {
        DEFAULT: 'hsl(var(--alert))', // DEPRECATED
      },
      overlay: {
        DEFAULT: 'hsl(var(--overlay))',
      },
      input: 'hsl(var(--input))',
      ring: 'hsl(var(--ring))',
      current: 'currentColor',
    },
    fontSize: {
      // DEPRECATED
      '2xs': ['0.625rem', '0.875rem'], // 10px font size, 14px line height
      xs: ['0.75rem', '1rem'], // 12px font size, 16px line height
      sm: ['0.875rem', '1.25rem'], // 14px font size, 20px line height
      base: ['1rem', '1.5rem'], // 16px font size, 24px line height (default)
      lg: ['1.125rem', '1.75rem'], // 18px font size, 28px line height
      xl: ['1.25rem', '1.75rem'], // 20px font size, 28px line height
      '2xl': ['1.5rem', '2rem'], // 24px font size, 32px line height
      '3xl': ['1.875rem', '2.25rem'], // 30px font size, 36px line height
      '4xl': ['2.25rem', '2.5rem'], // 36px font size, 40px line height
      '5xl': ['3rem', '1'], // 48px font size, 1 line height
      '6xl': ['3.75rem', '1'], // 60px font size, 1 line height
      '7xl': ['4.5rem', '1'], // 72px font size, 1 line height
      '8xl': ['6rem', '1'], // 96px font size, 1 line height
      '9xl': ['8rem', '1'], // 128px font size, 1 line height
      // END DEPRECATED

      inherit: 'inherit',
      ...texts,
    },
    extend: {
      fontFamily: {
        code: ['JetBrains Mono', 'monospace'],
      },
      opacity: {
        2.5: 0.025,
      },
      borderRadius: {
        ...borderRadii,
      },
      keyframes: {
        'pulse-shadow': {
          '0%': {
            boxShadow: '0 0 0 0 hsl(var(--pulse-color))',
          },
          '70%': {
            boxShadow: '0 0 0 var(--pulse-size, 6px) rgba(255, 82, 82, 0)',
          },
          '100%': {
            boxShadow: '0 0 0 0 rgba(255, 82, 82, 0)',
          },
        },
        'spin-slow': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        gradient: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        'pulse-subtle': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.85' },
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
        swing: {
          '0%, 9.9%, 100%': { transform: 'rotate(0deg)' },
          '10%': { transform: 'rotate(3deg)' },
          '20%': { transform: 'rotate(-3deg)' },
          '30%': { transform: 'rotate(2.25deg)' },
          '40%': { transform: 'rotate(-2.25deg)' },
          '50%': { transform: 'rotate(1.5deg)' },
          '60%': { transform: 'rotate(-1.5deg)' },
          '70%': { transform: 'rotate(0.75deg)' },
          '80%': { transform: 'rotate(-0.75deg)' },
          '90%': { transform: 'rotate(0.3deg)' },
        },
        jingle: {
          '0%, 100%': { transform: 'rotate(0deg)' },
          '10%': { transform: 'rotate(15deg)' },
          '20%': { transform: 'rotate(-15deg)' },
          '30%': { transform: 'rotate(11.25deg)' },
          '40%': { transform: 'rotate(-11.25deg)' },
          '50%': { transform: 'rotate(7.5deg)' },
          '60%': { transform: 'rotate(-7.5deg)' },
          '70%': { transform: 'rotate(3.75deg)' },
          '80%': { transform: 'rotate(-3.75deg)' },
          '90%': { transform: 'rotate(1.5deg)' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'pulse-subtle': 'pulse-subtle 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin-slow 3s linear infinite',
        swing: 'swing 3s ease-in-out',
        jingle: 'jingle 3s ease-in-out',
        gradient: 'gradient 5s ease infinite',
      },
      backgroundImage: {
        'test-pattern':
          'repeating-linear-gradient(135deg, hsl(var(--neutral-100)) 0, hsl(var(--neutral-100)) 2px, hsl(var(--neutral-200)) 2px, hsl(var(--neutral-200)) 4px)',
      },
      overflow: {
        initial: 'initial',
      },
    },
  },
  plugins: [
    animate,
    function ({ addUtilities }: { addUtilities: (utilities: Record<string, any>) => void }) {
      addUtilities({
        '.overflow-initial': { overflow: 'initial' },
        '.overflow-inherit': { overflow: 'inherit' },
      });
    },
  ],
};
