module.exports = {
  stories: ['../src/**/*.stories.mdx', '../src/**/*.stories.@(js|jsx|ts|tsx)'],
  addons: ['@storybook/addon-links', '@storybook/addon-essentials', 'storybook-preset-craco', 'storybook-dark-mode'],
  framework: '@storybook/react',
  features: {
    emotionAlias: false,
  },
};
