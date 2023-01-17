module.exports = {
  extends: ['../../.eslintrc.js'],
  rules: {
    'func-names': 'off',
    'no-restricted-imports': [
      'error',
      {
        patterns: ['@novu/shared/*', '@novu/dal/*', '!import2/good', 'mongoose'],
      },
    ],
  },
  ignorePatterns: '*.spec.ts',
};
