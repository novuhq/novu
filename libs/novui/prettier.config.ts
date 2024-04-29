import rootConfig from '../../prettier.config.js';
import { Config } from 'prettier';

const config: Config = {
  ...rootConfig,
  plugins: ['@pandabox/prettier-plugin'],
};

export default config;
