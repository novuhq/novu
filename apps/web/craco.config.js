const CracoAntDesignPlugin = require('craco-antd');
const path = require('path');
const BabelRcPlugin = require('@jackwilsdon/craco-use-babelrc');

module.exports = {
  resolve: {
    alias: {
      react: path.resolve('./node_modules/react'),
      'react-dom': path.resolve('./node_modules/react-dom'),
    },
  },
  eslint: {
    enable: false,
  },
  plugins: [
    { plugin: BabelRcPlugin },
    {
      plugin: CracoAntDesignPlugin,
      options: {
        customizeThemeLessPath: path.join(__dirname, 'src/styles/index.less'),
      },
    },
  ],
};
