import { defineConfig } from 'cypress';

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
