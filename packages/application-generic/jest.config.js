/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: {
    axios: 'axios/dist/node/axios.cjs',
  },
  setupFiles: ['./jest.setup.js'],
};
