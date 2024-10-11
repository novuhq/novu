// Eslint v9.0 and above plugins
import tsEslint from 'typescript-eslint';
import jsEslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import panda from '@pandacss/eslint-plugin';
import pluginCypress from 'eslint-plugin-cypress/flat';
import localRules from 'eslint-plugin-local-rules';

// Eslint v8.0 and below plugins
import reactHooks from 'eslint-plugin-react-hooks';
import promise from 'eslint-plugin-promise';
import unusedImports from 'eslint-plugin-unused-imports';
import deprecation from 'eslint-plugin-deprecation';

/**
 * Eslint v8 compatibility packages
 *
 * This file was migrated from eslintrc.js to eslint.config.mjs using the following command:
 * `npx @eslint/migrate-config .eslintrc.js`
 *
 * After better compatibility for Eslint Flat Config is present in the Eslint plugin
 * ecosystem, we should remove `@eslint/compat` and the `fixupConfigRules` and
 * `fixupPluginRules` functions.
 *
 * @see https://github.com/eslint/eslint/issues/18010
 */
import { fixupConfigRules, fixupPluginRules } from '@eslint/compat';
import { FlatCompat } from '@eslint/eslintrc';

const compat = new FlatCompat({ baseDirectory: import.meta.dirname });

/**
 * REUSED RULE CONFIGURATIONS
 *
 * This is necessary because Eslint doesn't merge rule configurations
 * when they are targeting different paths.
 */

/**
 * This rule ensures that "multi-level" imports are not used for `@novu/*` packages.
 */
const noRestrictedImportsMultiLevelNovuPattern = {
  group: [
    '@novu/*/**/*',
    // These packages have legitimate exports 1 path part below the root level
    // This flatMap logic ignores the path 1 below the root level and prevents deeper imports.
    ...['framework', 'js', 'novui'].flatMap((pkg) => [`!@novu/${pkg}/**/*`, `@novu/${pkg}/*/**/*`]),
  ],
  message: "Please import only from the root package entry point. For example, use 'import { Client } from '@novu/node';' instead of 'import { Client } from '@novu/node/src';'",
};

export default tsEslint.config(
  /* ******************** RECOMMENDED CONFIG ******************** */
  jsEslint.configs.recommended,
  ...fixupConfigRules(
    compat.extends(
      /**
       * Airbnb is still migrating to Eslint v9.0
       *
       * @see https://github.com/iamturns/eslint-config-airbnb-typescript/issues/331
       */
      'airbnb-base',
      'airbnb-typescript'
    )
  ),
  eslintPluginPrettierRecommended, // KEEP PRETTIER CONFIG LAST TO AVOID CONFLICTS

  /* ******************** IGNORES ******************** */
  {
    ignores: [
      '**/dist/**',
      '**/build/**',
      '**/node_modules/**',
      '**/playwright-report/**',
      '**/styled-system/**',
      '**/coverage/**',
      '**/.next/**',
      '**/.storybook/**',
      '**/.nx/**',
      '**/config-overrides.js',
      '**/env-config.js',
      '**/*.config.{js,cjs,mjs}',
      '**/iframeResizer.contentWindow.js',
      '**/size-limit.mjs',
      '**/eslint-local-rules.js',
      '**/get-packages-folder.mjs',
      '**/scripts/**',
      '**/jest.setup.js',
      '**/check-ee.mjs',
      '**/libs/embed/src/shared/**',
      '**/*.stories.*',
      '**/notifications-cache.test.ts',
      '**/novu.test.ts',
      '**/swagger.controller.ts',
    ],
  },

  /* ******************** TYPESCRIPT FILES ******************** */
  {
    plugins: {
      promise: fixupPluginRules(promise),
    },

    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },

    linterOptions: {
      reportUnusedDisableDirectives: 'error',
    },

    rules: {
      'unused-imports/no-unused-imports': 'off',
      '@typescript-eslint/space-before-blocks': 'off',
      '@typescript-eslint/lines-between-class-members': 'off',
      "@typescript-eslint/no-throw-literal": "off",
      "@typescript-eslint/only-throw-error": "error",
      'react/jsx-wrap-multilines': 'off',
      'react/jsx-filename-extension': 'off',
      'multiline-comment-style': ['warn', 'starred-block'],
      'promise/catch-or-return': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-unused-expressions': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      'react/jsx-closing-bracket-location': 'off',
      '@typescript-eslint/no-var-requires': 'off',
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
      'no-else-return': 'off',
      'import/export': 'off',
      'consistent-return': 'off',
      'no-param-reassign': [
        'error',
        {
          props: true,
          ignorePropertyModificationsFor: ['prev', 'acc'], // ignore for Array.reduce
        },
      ],

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
            noRestrictedImportsMultiLevelNovuPattern,
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

  /* ******************** JAVASCRIPT FILES ******************** */
  {
    files: ['**/*.{js,jsx,cjs,mjs}'],
    ...tsEslint.configs.disableTypeChecked,
  },

  /* ******************** MONOREPO PACKAGES ******************** */
  {
    files: ['packages/framework/**'],
    plugins: {
      'unused-imports': fixupPluginRules(unusedImports),
    },
    rules: {
      'max-len': 'off',
      '@typescript-eslint/no-explicit-any': 'error',
      'import/prefer-default-export': 0,
      'sonarjs/prefer-immediate-return': 0,
      'const-case/uppercase': 0,
      'unicorn/no-array-reduce': 0,
      'unused-imports/no-unused-imports': 'error',
    },
  },

  {
    files: ['packages/providers/**'],
    plugins: {
      deprecation: fixupPluginRules(deprecation),
    },
    rules: {
      'deprecation/deprecation': 'error',
    },
  },

  {
    files: ['apps/api/**'],
    rules: {
      'func-names': 'off',
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            noRestrictedImportsMultiLevelNovuPattern,
            {
              /**
               * This rule ensures that the overridden Swagger decorators are used,
               * which apply common responses to all API endpoints.
               */
              group: ['@nestjs/swagger'],
              importNames: [
                'ApiOkResponse',
                'ApiCreatedResponse',
                'ApiAcceptedResponse',
                'ApiNoContentResponse',
                'ApiMovedPermanentlyResponse',
                'ApiFoundResponse',
                'ApiBadRequestResponse',
                'ApiUnauthorizedResponse',
                'ApiTooManyRequestsResponse',
                'ApiNotFoundResponse',
                'ApiInternalServerErrorResponse',
                'ApiBadGatewayResponse',
                'ApiConflictResponse',
                'ApiForbiddenResponse',
                'ApiGatewayTimeoutResponse',
                'ApiGoneResponse',
                'ApiMethodNotAllowedResponse',
                'ApiNotAcceptableResponse',
                'ApiNotImplementedResponse',
                'ApiPreconditionFailedResponse',
                'ApiPayloadTooLargeResponse',
                'ApiRequestTimeoutResponse',
                'ApiServiceUnavailableResponse',
                'ApiUnprocessableEntityResponse',
                'ApiUnsupportedMediaTypeResponse',
                'ApiDefaultResponse',
              ],
              message: "Use 'Api<Error>Response' from '/shared/framework/response.decorator' instead.",
            },
          ],
        },
      ],
    },
  },

  /* ******************** WEB PACKAGES ******************** */
  {
    files: [
      'libs/design-system/**',
      'libs/novui/**',
      'apps/widget/**',
      'apps/web/**',
      'packages/notification-center/**',
    ],
    extends: [pluginCypress.configs.recommended],
    plugins: {
      '@pandacss': panda,
      'react-hooks': fixupPluginRules(reactHooks),
    },
    rules: {
      ...panda.configs.recommended.rules,
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
      '@typescript-eslint/no-explicit-any': 'warn',
      'jsx-a11y/aria-role': 'off',
      'jsx-a11y/no-static-element-interactions': 'off',
      'react/require-default-props': 'off',
      'react/no-danger': 'off',
      'jsx-a11y/click-events-have-key-events': 'off',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',

      '@typescript-eslint/naming-convention': [
        'error',
        {
          filter: '_',
          selector: 'variableLike',
          leadingUnderscore: 'allow',
          format: ['PascalCase', 'camelCase', 'UPPER_CASE'],
        },
      ],

      '@pandacss/no-config-function-in-source': 'off',
    },
  },

  /* ******************** INBOX PACKAGES ******************** */
  {
    files: ['packages/js/**', 'packages/react/**'],
    plugins: {
      'local-rules': localRules,
    },
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
  }
);
