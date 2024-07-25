module.exports = {
  extends: ['../../.eslintrc.js'],
  plugins: ['local-rules'],
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
    'local-rules/no-class-without-style': 'error',
    'id-length': 'off',
    '@typescript-eslint/no-shadow': 'off',
  },
  parserOptions: {
    project: './tsconfig.json',
    ecmaVersion: 2020,
    sourceType: 'module',
  },
};
