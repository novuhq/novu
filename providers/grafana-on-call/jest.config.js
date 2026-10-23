/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFiles: ['../jest.web-streams-setup.js'],
    "moduleNameMapper": {
      "axios": "axios/dist/node/axios.cjs"
    }
};
