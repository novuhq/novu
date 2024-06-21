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
          ...generateColorShades('nv-color-primary'),
          ...generateColorShades('nv-color-primary-alpha'),
        },
        primaryForeground: generateColorShades('nv-color-primary-foreground-alpha'),
        secondary: {
          ...generateColorShades('nv-color-secondary'),
          ...generateColorShades('nv-color-secondary-alpha'),
        },
        secondaryForeground: generateColorShades('nv-color-secondary-foreground-alpha'),
        background: generateColorShades('nv-color-background-alpha'),
        foreground: generateColorShades('nv-color-foreground-alpha'),
        neutral: generateColorShades('nv-color-neutral-alpha'),
      },
    },
  },
  plugins: [],
};
