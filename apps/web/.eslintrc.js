module.exports = {
  extends: ['../../.eslintrc.js'],
  rules: {
    'func-names': 'off',
    'react/jsx-props-no-spreading': 'off',
    'react/no-array-index-key': 'off',
    'no-empty-pattern': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    'react/no-unescaped-entities': 'off',
    'react/jsx-closing-bracket-location': 'off',
    '@typescript-eslint/ban-types': 'off',
    'react/jsx-wrap-multilines': 'off',
    'jsx-a11y/anchor-is-valid': 'off',
    'promise/catch-or-return': 'off',
    'react/jsx-one-expression-per-line': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    'jsx-a11y/aria-role': 'off',
    'jsx-a11y/no-static-element-interactions': 'off',
    'react/require-default-props': 'off',
    'react/no-danger': 'off',
    'jsx-a11y/click-events-have-key-events': 'off',
    'no-restricted-imports': [
      'error',
      {
        paths: [
          {
            name: '@novu/dal',
          },
          {
            name: '@playwright/test',
            importNames: ['test'],
            message: `please use import { test } from './utils/baseTest' instead.`,
          },
          // TODO: re-enable this once we have de-coupled web's build from linting
          /*
          {
            name: '@mantine/core',
            message:
              'Please avoid referencing @mantine/core directly in new or updated code. Instead, import from @novu/novui',
          },
          */
        ],
      },
    ],
    '@typescript-eslint/naming-convention': [
      'error',
      {
        filter: '_',
        selector: 'variableLike',
        leadingUnderscore: 'allow',
        format: ['PascalCase', 'camelCase', 'UPPER_CASE'],
      },
    ],
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',
    'import/extensions': 'off',
  },
  ignorePatterns: ['craco.config.js', '**/styled-system/**/*'],
  plugins: ['react-hooks'],
  parserOptions: {
    project: './tsconfig.json',
    ecmaVersion: 2020,
    sourceType: 'module',
  },
};
