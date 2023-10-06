module.exports = function (options) {
  return {
    ...options,
    module: {
      rules: [
        {
          test: /\.ts$/,
          exclude: /node_modules/,
          use: {
            loader: 'swc-loader',
            options: swcDefaultConfig,
          },
        },
      ],
    },
    devtool: 'source-map',
  };
};
