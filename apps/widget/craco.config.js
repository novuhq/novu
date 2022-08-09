const CracoAntDesignPlugin = require('craco-antd');
const path = require('path');

module.exports = {
  babel: {
    plugins: [
      [
        'babel-plugin-styled-components',
        {
          displayName: true,
        },
      ],
    ],
  },
  webpack: {
    configure: (webpackConfig) => {
      return {
        ...webpackConfig,
        resolve: {
          ...webpackConfig.resolve,
          alias: {
            ...webpackConfig.alias,
            '@nestjs/swagger': path.resolve(__dirname, './node_modules/@nestjs/swagger/dist/extra/swagger-shim.js'),
          },
        },
      };
    },
  },
};
