module.exports = {
  plugins: {
    autoprefixer: {},
    tailwindcss: {},
    'postcss-prefix-selector': {
      transform: function (_, selector) {
        // Prefix each class selector with :where(.class)
        if (selector.startsWith('.') && !selector.includes('::after') && !selector.includes('::before')) {
          return `:where(${selector})`;
        }

        return selector; // Return other selectors unchanged
      },
    },
  },
};
