/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  transform: {
    '^.+\\.ts$': 'ts-jest',
    '^.+\\.js$': 'babel-jest',
  },
  "moduleNameMapper": {
    "axios": "axios/dist/node/axios.cjs"
  },
  transformIgnorePatterns: ['<rootDir>/node_modules/'],
};
