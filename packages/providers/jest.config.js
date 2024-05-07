/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^axios$': 'axios/dist/node/axios.cjs',
    'firebase-admin/app': ['<rootDir>/node_modules/firebase-admin/lib/app'],
    'firebase-admin/messaging': [
      '<rootDir>/node_modules/firebase-admin/lib/messaging',
    ],
  },
  transform: {
    '^.+\\.ts$': 'ts-jest',
    '^.+\\.js$': 'babel-jest',
  },
  transformIgnorePatterns: ['<rootDir>/node_modules/'],
};
