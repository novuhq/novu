import { fixupConfigRules, fixupPluginRules } from '@eslint/compat';
import _import from 'eslint-plugin-import';
import promise from 'eslint-plugin-promise';
import unusedImports from 'eslint-plugin-unused-imports';
import typescriptEslint from '@typescript-eslint/eslint-plugin';
import prettier from 'eslint-plugin-prettier';
import tsParser from '@typescript-eslint/parser';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import js from '@eslint/js';
import { FlatCompat } from '@eslint/eslintrc';

/**
 * This file was migrated from eslintrc.js to eslint.config.mjs using the following command:
 * `npx @eslint/migrate-config .eslintrc.js`
 *
 * After better compatibility for Eslint Flat Config is present in the Eslint plugin
 * ecosystem, we should remove `@eslint/compat` and the `fixupConfigRules` and
 * `fixupPluginRules` functions.
 *
 * @see https://github.com/eslint/eslint/issues/18010
 */

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);
const compat = new FlatCompat({
  baseDirectory: dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});

export default [
  {
    ignores: ['**/*.json', '**/node_modules', '**/.DS_Store'],
  },
  ...fixupConfigRules(
    compat.extends(
      'airbnb-typescript',
      'plugin:import/typescript',
      'plugin:@typescript-eslint/recommended',
      'prettier',
      'plugin:prettier/recommended',
      'plugin:promise/recommended',
      'plugin:deprecation/recommended'
    )
  ),
  {
    plugins: {
      import: fixupPluginRules(_import),
      promise: fixupPluginRules(promise),
      '@typescript-eslint': fixupPluginRules(typescriptEslint),
      prettier: fixupPluginRules(prettier),
    },

    languageOptions: {
      parser: tsParser,
      ecmaVersion: 2020,
      sourceType: 'module',

      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: dirname,
      },
    },

    settings: {
      'import/parsers': {
        '@typescript-eslint/parser': ['.ts', '.tsx'],
      },
    },

    rules: {
      'unused-imports/no-unused-imports': 'off',
      '@typescript-eslint/space-before-blocks': 'off',
      '@typescript-eslint/lines-between-class-members': 'off',
      'react/jsx-wrap-multilines': 'off',
      'react/jsx-filename-extension': 'off',
      'multiline-comment-style': ['warn', 'starred-block'],
      'promise/catch-or-return': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-unused-expressions': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      'react/jsx-closing-bracket-location': 'off',
      '@typescript-eslint/no-var-requires': 'off',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['off'],
      'mocha/no-mocha-arrows': 'off',
      '@typescript-eslint/default-param-last': 'off',
      'no-return-await': 'off',
      'no-await-in-loop': 'off',
      'no-continue': 'off',
      'no-console': 'warn',
      'no-prototype-builtins': 'off',
      'import/no-cycle': 'off',
      'class-methods-use-this': 'off',
      '@typescript-eslint/no-use-before-define': 'off',
      '@typescript-eslint/no-explicit-any': 1,
      'no-restricted-syntax': 'off',
      '@typescript-eslint/interface-name-prefix': 'off',
      'no-underscore-dangle': 'off',
      'import/prefer-default-export': 'off',
      'import/no-extraneous-dependencies': 'off',
      'import/no-namespace': 'error',
      'react/jsx-one-expression-per-line': 'off',
      'react/jsx-no-bind': 'off',
      'lines-between-class-members': 'off',
      'max-classes-per-file': 'off',
      'react/react-in-jsx-scope': 'off',

      'max-len': [
        'warn',
        {
          code: 140,
        },
      ],

      '@typescript-eslint/return-await': 'off',
      '@typescript-eslint/no-base-to-string': 'error',

      'no-restricted-imports': [
        'error',
        {
          patterns: [
            '@novu/shared/*',
            '!@novu/shared/utils',
            '@novu/dal/*',
            '!import2/good',
            '*../libs/dal/*',
            '*../libs/shared/*',
            '*../libs/stateless/*',
          ],
        },
      ],

      'padding-line-between-statements': [
        'error',
        {
          blankLine: 'any',
          prev: ['const', 'let', 'var'],
          next: ['if', 'for'],
        },
        {
          blankLine: 'any',
          prev: ['const', 'let', 'var'],
          next: ['const', 'let', 'var'],
        },
        {
          blankLine: 'always',
          prev: '*',
          next: 'return',
        },
      ],

      'id-length': [
        'error',
        {
          min: 2,
          exceptions: ['i', 'e', 'a', 'b', '_', 't'],
          properties: 'never',
        },
      ],

      '@typescript-eslint/naming-convention': [
        'error',
        {
          selector: 'enumMember',
          format: ['UPPER_CASE'],
        },
        {
          selector: 'enum',
          format: ['PascalCase'],
          suffix: ['Enum'],
        },
        {
          selector: 'class',
          format: ['PascalCase'],
        },
        {
          selector: 'variableLike',
          format: ['camelCase', 'UPPER_CASE', 'PascalCase'],
          leadingUnderscore: 'allow',
        },
        {
          selector: 'interface',
          format: ['PascalCase'],
          prefix: ['I'],
        },
        {
          selector: ['function'],
          format: ['camelCase', 'PascalCase'],
          leadingUnderscore: 'allow',
        },
      ],

      'prettier/prettier': [
        'error',
        {
          endOfLine: 'auto',
        },
      ],
    },
  },
  {
    files: ['packages/framework/**'],
    plugins: {
      'unused-imports': fixupPluginRules(unusedImports),
    },
    rules: {
      'max-len': 'off',
      '@typescript-eslint/no-explicit-any': 'error',
      'import/prefer-default-export': 0,
      'no-else-return': 0,
      'sonarjs/prefer-immediate-return': 0,
      'const-case/uppercase': 0,
      'unicorn/no-array-reduce': 0,
      'unused-imports/no-unused-imports': 'error',
      'no-unused-vars': 'error',
    },
  },
];
