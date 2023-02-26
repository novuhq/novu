module.exports = {
  extends: ['../../.eslintrc.js'],
  overrides: [
    {
      files: ['*.test.ts'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/naming-convention': 'off',
      },
    },
  ],
};
