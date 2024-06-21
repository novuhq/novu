function generateColorShades(baseName) {
  return {
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
        primary: {
          ...generateSolidColorShades('nv-color-primary'),
          ...generateAlphaColorShades('nv-color-primary-alpha'),
        },
        primaryForeground: generateAlphaColorShades('nv-color-primary-foreground-alpha'),
        secondary: {
          ...generateSolidColorShades('nv-color-secondary'),
          ...generateAlphaColorShades('nv-color-secondary-alpha'),
        },
        secondaryForeground: generateAlphaColorShades('nv-color-secondary-foreground-alpha'),
        background: generateAlphaColorShades('nv-color-background-alpha'),
        foreground: generateAlphaColorShades('nv-color-foreground-alpha'),
        neutral: generateAlphaColorShades('nv-color-neutral-alpha'),
      },
    },
  },
  plugins: [],
};
