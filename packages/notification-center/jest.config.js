module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  transform: {
    '.+\\.(css|styl|less|sass|scss|png|jpg|ttf|woff|woff2)$': 'jest-transform-stub',
  },
};
