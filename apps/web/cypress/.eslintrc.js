module.exports = {
  extends: ['plugin:cypress/recommended'],
  plugins: ['cypress'],
  ignorePatterns: ['tests/*'],
  parserOptions: {
    project: './tsconfig.json',
    ecmaVersion: 2020,
    sourceType: 'module',
  },
};
