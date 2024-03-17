import { defineConfig } from 'cypress';
const configOverride = require('./config-overrides');

const path = require('path');
const { babelInclude, override } = require('customize-cra');

//Get webpack from react-app-rewired - this finds the original webpack and then uses config-overrides.json to override
const webpackOverride = require('react-app-rewired/overrides/webpack');

/*
 * our config-overrides.json has babelInclude([path.resolve('./src')]) which means our cypress files are not included in the webpack
 * so override it to include both src and cypress
 */
const overrideBabel = override(babelInclude([path.resolve('./src'), path.resolve('./cypress')]));

//Construct the new webpack
const webpack = overrideBabel(webpackOverride());

//Not sure why this is required but is false (boolean) by default and webpack wants a string
webpack.output.devtoolModuleFilenameTemplate = '[name].js';

export default defineConfig({
  viewportHeight: 900,
  viewportWidth: 1280,
  video: false,

  retries: {
    runMode: 3,
    openMode: 0,
  },

  e2e: {
    setupNodeEvents(on, config) {
      // eslint-disable-next-line import/extensions
      return require('./cypress/plugins/index.ts')(on, config);
    },
    baseUrl: 'http://127.0.0.1:4200',
    specPattern: 'cypress/tests/**/*.{js,jsx,ts,tsx}',
  },

  env: {
    NODE_ENV: 'test',
    apiUrl: 'http://127.0.0.1:1336',
    GITHUB_USER_EMAIL: '',
    GITHUB_USER_PASSWORD: '',
    BLUEPRINT_CREATOR: '645b648b36dd6d25f8650d37',
    MONGODB_URL: 'mongodb://127.0.0.1:27017/novu-test',
    IS_CI: false,
    coverage: false,
  },

  projectId: '293ci7',

  component: {
    experimentalSingleTabRunMode: true,
    specPattern: 'src/**/*.cy.{js,jsx,ts,tsx}',
    devServer: {
      framework: 'create-react-app',
      bundler: 'webpack',
      webpackConfig: webpack,
    },
  },
});
