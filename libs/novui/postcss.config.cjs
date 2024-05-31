module.exports = {
  /**
   * Must use array + require syntax for vite + postcss & panda
   * https://vitejs.dev/config/shared-options.html#css-postcss
   * https://panda-css.com/docs/installation/storybook#install-panda
   */
  plugins: [
    require('@pandacss/dev/postcss')(),
    require('postcss-preset-mantine')(),
    require('postcss-simple-vars')({
      variables: {
        'mantine-breakpoint-xs': '36em',
        'mantine-breakpoint-sm': '48em',
        'mantine-breakpoint-md': '62em',
        'mantine-breakpoint-lg': '75em',
        'mantine-breakpoint-xl': '88em',
      },
    }),
  ],
};
