module.exports = {
  '*.{e2e,e2e-ee,spec}.{js,ts}': ['stop-only --file'],
  '**/*.{ts,tsx,js,jsx,json}': () => ['biome check --write --staged --no-errors-on-unmatched --diagnostic-level=error'],
};
