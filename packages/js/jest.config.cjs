module.exports = {
  preset: 'ts-jest',
  setupFiles: ['./jest.setup.ts'],
  globals: {
    NOVU_API_VERSION: '2024-06-26',
    PACKAGE_NAME: '@novu/js',
    PACKAGE_VERSION: 'test',
  },
};
