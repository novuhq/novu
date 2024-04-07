module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: {
    uuid: require.resolve('uuid'),
  },
};
