/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
module.exports = {
  preset: 'ts-jest',
  // Pinned explicitly: the bare 'node' alias resolves to the hoisted
  // jest-environment-node 30, which jest 27's runner cannot drive.
  testEnvironment: require.resolve('jest-environment-node'),
  moduleNameMapper: {
    axios: 'axios/dist/node/axios.cjs',
  },
  setupFiles: ['./jest.setup.js'],
};
