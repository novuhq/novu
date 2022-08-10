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
};
