module.exports = {
  extends: ['../../.eslintrc.js'],
  rules: {
    'func-names': 'off',
  },
  parserOptions: {
    project: './tsconfig.json',
    ecmaVersion: 2020,
    sourceType: 'module',
    tsconfigRootDir: __dirname,
  },
};
