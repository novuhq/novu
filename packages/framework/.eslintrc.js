module.exports = {
  extends: ['../../.eslintrc.js'],
  parserOptions: {
    project: './tsconfig.json',
    ecmaVersion: 2020,
    sourceType: 'module',
    tsconfigRootDir: __dirname,
  },
  plugins: ['unused-imports'],
  rules: {
    'max-len': 'off',
    '@typescript-eslint/no-explicit-any': 'error',
    'import/prefer-default-export': 0,
    'no-else-return': 0,
    'sonarjs/prefer-immediate-return': 0,
    'const-case/uppercase': 0,
    'unicorn/no-array-reduce': 0,
    'unused-imports/no-unused-imports': 'error',
  },
};
