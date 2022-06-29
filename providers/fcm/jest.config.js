/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  resolver: 'jest-node-exports-resolver',
  modulePathIgnorePatterns: ['build'],
};
