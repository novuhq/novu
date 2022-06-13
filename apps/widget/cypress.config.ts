import { defineConfig } from 'cypress';

export default defineConfig({
  chromeWebSecurity: false,
  video: false,
  projectId: 'vzkh7c',
  env: {
    NODE_ENV: 'test',
    API_URL: 'http://localhost:3000',
  },
  e2e: {
    // We've imported your old cypress plugins here.
    // You may want to clean this up later by importing these.
    setupNodeEvents(on, config) {
      return require('./cypress/plugins/index.ts')(on, config);
    },
    baseUrl: 'http://localhost:4500',
    specPattern: 'cypress/e2e/**/*.{js,jsx,ts,tsx}',
  },
});
