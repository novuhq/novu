module.exports = {
  // Automatically clear mock calls, instances, contexts and results before every test
  clearMocks: true,
  coverageProvider: 'v8',
  preset: 'ts-jest',
  roots: ['<rootDir>/src'],
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.[jt]s?(x)', '**/?(*.)+(spec|test).[tj]s?(x)'],
};
