module.exports = {
  plugins: {
    autoprefixer: {},
    tailwindcss: {},
    'postcss-prefix-selector': {
      transform: function (_, selector) {
        // Prefix each class selector with :where(.class)
        if (selector.startsWith('.')) {
          return `:where(${selector})`;
        }

        return selector; // Return other selectors unchanged
      },
    },
  },
};
