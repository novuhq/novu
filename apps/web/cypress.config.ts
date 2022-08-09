import { defineConfig } from 'cypress';
const webpackPreprocessor = require('@cypress/webpack-preprocessor');
const path = require('path');

export default defineConfig({
  viewportHeight: 700,
  viewportWidth: 1280,
  video: false,

  retries: {
    runMode: 2,
    openMode: 0,
  },

  e2e: {
    setupNodeEvents(on, config) {
      on(
        'file:preprocessor',
        webpackPreprocessor({
          resolve: {
            alias: {
              '@nestjs/swagger': path.resolve(__dirname, './node_modules/@nestjs/swagger/dist/extra/swagger-shim.js'),
            },
          },
        })
      );

      // eslint-disable-next-line import/extensions
      return require('./cypress/plugins/index.ts')(on, config);
    },
    baseUrl: 'http://localhost:4200',
    specPattern: 'cypress/tests/**/*.{js,jsx,ts,tsx}',
  },

  env: {
    NODE_ENV: 'test',
    apiUrl: 'http://localhost:1336',
    coverage: false,
  },

  projectId: '293ci7',

  component: {
    specPattern: 'src/**/*.cy.{js,jsx,ts,tsx}',
    devServer: {
      framework: 'create-react-app',
      bundler: 'webpack',
    },
  },
});
