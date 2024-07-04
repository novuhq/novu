module.exports = {
  extends: ['../../.eslintrc.js'],
  rules: {
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/naming-convention': [
      'error',
      {
        filter: '_',
        selector: 'variableLike',
        leadingUnderscore: 'allow',
        format: ['PascalCase', 'camelCase', 'UPPER_CASE'],
      },
    ],
  },
  parserOptions: {
    project: './tsconfig.json',
    ecmaVersion: 2020,
    sourceType: 'module',
  },
};
