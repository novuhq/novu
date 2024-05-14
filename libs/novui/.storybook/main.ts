import { dirname, join } from 'path';
import { StorybookConfig } from '@storybook/react-vite';

export default {
  stories: ['../src/**/*.stories.mdx', '../src/**/*.stories.@(js|jsx|ts|tsx)'],

  addons: [getAbsolutePath('storybook-dark-mode'), getAbsolutePath('@storybook/addon-mdx-gfm')],

  framework: {
    name: '@storybook/react-vite',
    options: {},
  },

  docs: {
    autodocs: true,
  },

  staticDirs: ['./public'],
} satisfies StorybookConfig;

function getAbsolutePath(value) {
  return dirname(require.resolve(join(value, 'package.json')));
}
