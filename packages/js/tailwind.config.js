function defaultColor(baseName) {
  return `var(--${baseName})`;
}

function generateColorShades(baseName) {
  return {
    25: `var(--${baseName}-25)`,
    50: `var(--${baseName}-50)`,
    100: `var(--${baseName}-100)`,
    200: `var(--${baseName}-200)`,
    300: `var(--${baseName}-300)`,
    400: `var(--${baseName}-400)`,
    500: `var(--${baseName}-500)`,
    600: `var(--${baseName}-600)`,
    700: `var(--${baseName}-700)`,
    800: `var(--${baseName}-800)`,
    900: `var(--${baseName}-900)`,
  };
}

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  prefix: 'nt-',
  corePlugins: {
    preflight: false,
  },
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: defaultColor('nv-color-primary'), ...generateColorShades('nv-color-primary') },
        'primary-alpha': generateColorShades('nv-color-primary-alpha'),
        'primary-foreground': defaultColor('nv-color-primary-foreground'),
        'primary-foreground-alpha': generateColorShades('nv-color-primary-foreground-alpha'),
        secondary: { DEFAULT: defaultColor('nv-color-secondary'), ...generateColorShades('nv-color-secondary') },
        'secondary-alpha': generateColorShades('nv-color-secondary-alpha'),
        'secondary-foreground': defaultColor('nv-color-secondary-foreground'),
        'secondary-foreground-alpha': generateColorShades('nv-color-secondary-foreground-alpha'),
        counter: { DEFAULT: defaultColor('nv-color-counter'), ...generateColorShades('nv-color-counter') },
        'counter-foreground': defaultColor('nv-color-counter-foreground'),
        'counter-foreground-alpha': generateColorShades('nv-color-accent-foreground-alpha'),
        background: defaultColor('nv-color-background'),
        'background-alpha': generateColorShades('nv-color-background-alpha'),
        foreground: defaultColor('nv-color-foreground'),
        'foreground-alpha': generateColorShades('nv-color-foreground-alpha'),
        'neutral-alpha': generateColorShades('nv-color-neutral-alpha'),
        shadow: defaultColor('nv-color-shadow'),
        ring: defaultColor('nv-color-ring'),
        border: defaultColor('nv-color-neutral-alpha-100'),
      },
      borderRadius: {
        none: 'var(--nv-radius-none)',
        sm: 'var(--nv-radius-sm)',
        DEFAULT: 'var(--nv-radius-base)',
        md: 'var(--nv-radius-md)',
        lg: 'var(--nv-radius-lg)',
        xl: 'var(--nv-radius-xl)',
        '2xl': 'var(--nv-radius-2xl)',
        full: 'var(--nv-radius-full)',
      },
      boxShadow: {
        popover:
          '0px 8px 26px 0px oklch(from var(--nv-color-shadow) l c h / 0.08), 0px 2px 6px 0px oklch(from var(--nv-color-shadow) l c h / 0.12)',
        dropdown:
          '0px 12px 16px -4px oklch(from var(--nv-color-shadow) l c h / 0.08), 0px 4px 6px -2px oklch(from var(--nv-color-shadow) l c h / 0.03)',
        tooltip: '0 5px 20px 0 oklch(from var(--nv-color-shadow) l c h / 0.08)',
      },
      fontSize: {
        xs: ['var(--nv-font-size-xs)', { lineHeight: 'var(--nv-line-height-xs)' }],
        sm: ['var(--nv-font-size-sm)', { lineHeight: 'var(--nv-line-height-sm)' }],
        base: ['var(--nv-font-size-base)', { lineHeight: 'var(--nv-line-height-base)' }],
        lg: ['var(--nv-font-size-lg)', { lineHeight: 'var(--nv-line-height-lg)' }],
        xl: ['var(--nv-font-size-xl)', { lineHeight: 'var(--nv-line-height-xl)' }],
        '2xl': ['var(--nv-font-size-2xl)', { lineHeight: 'var(--nv-line-height-2xl)' }],
        '3xl': ['var(--nv-font-size-3xl)', { lineHeight: 'var(--nv-line-height-3xl)' }],
        '4xl': ['var(--nv-font-size-4xl)', { lineHeight: 'var(--nv-line-height-4xl)' }],
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
