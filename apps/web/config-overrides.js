const { useBabelRc, override } = require('customize-cra');
const path = require('path');

module.exports = override(useBabelRc(), (config) => {
  return {
    ...config,
    resolve: {
      ...config.resolve,
      alias: {
        ...config.alias,
        '@nestjs/swagger': path.resolve(__dirname, './node_modules/@nestjs/swagger/dist/extra/swagger-shim.js'),
      },
    },
  };
});
