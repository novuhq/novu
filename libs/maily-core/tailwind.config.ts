import sharedConfig from '@novu/maily-tailwind-config/tailwind.config';
import type { Config } from 'tailwindcss';

const config: Pick<Config, 'prefix' | 'presets' | 'corePlugins' | 'theme' | 'plugins'> = {
  prefix: 'mly-',
  corePlugins: {
    // Disable preflight to avoid Tailwind overriding the styles of the editor.
    preflight: false,
  },
  theme: {
    extend: {
      colors: {
        'soft-gray': '#f4f5f6',
        'midnight-gray': '#333333',
      },
    },
  },
  presets: [sharedConfig],
};

export default config;
