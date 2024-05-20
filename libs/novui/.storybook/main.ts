import { StorybookConfig } from '@storybook/react-vite';

export default {
  stories: ['../src/**/*.stories.mdx', '../src/**/*.stories.@(js|jsx|ts|tsx)'],

  addons: ['storybook-dark-mode', '@storybook/addon-controls'],

  framework: {
    name: '@storybook/react-vite',
    options: {},
  },

  docs: {
    // TODO: re-enable docs when we decide how to incorporate them
    autodocs: false,
  },

  staticDirs: ['./public'],
} satisfies StorybookConfig;
