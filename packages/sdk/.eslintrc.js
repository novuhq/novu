module.exports = {
  extends: ['../../.eslintrc.js'],
  parserOptions: {
    project: './tsconfig.json',
    ecmaVersion: 2020,
    sourceType: 'module',
    tsconfigRootDir: __dirname,
  },
  rules: {
    '@typescript-eslint/no-explicit-any': 'off',
    'import/prefer-default-export': 0,
    'no-else-return': 0,
    'sonarjs/prefer-immediate-return': 0,
    'const-case/uppercase': 0,
    'unicorn/no-array-reduce': 0,
  },
};
