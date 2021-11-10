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
  plugins: [
    {
      plugin: CracoAntDesignPlugin,
      options: {
        customizeThemeLessPath: path.join(__dirname, 'src/styles/theme.less'),
      },
    },
  ],
};
