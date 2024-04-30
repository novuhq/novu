import { dirname, join } from 'path';
import { StorybookConfig } from '@storybook/react-webpack5';

export default {
  stories: ['../src/**/*.stories.mdx', '../src/**/*.stories.@(js|jsx|ts|tsx)'],

  addons: [
    getAbsolutePath('@storybook/addon-links'),
    getAbsolutePath('@storybook/addon-essentials'),
    getAbsolutePath('storybook-dark-mode'),
    getAbsolutePath('@storybook/addon-mdx-gfm'),
  ],

  framework: {
    name: '@storybook/react-webpack5',
    options: {},
  },

  features: {
    emotionAlias: false,
  },

  docs: {
    autodocs: true,
  },

  staticDirs: ['./public'],
} satisfies StorybookConfig;

function getAbsolutePath(value) {
  return dirname(require.resolve(join(value, 'package.json')));
}
