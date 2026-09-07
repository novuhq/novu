module.exports = {
  '*.{e2e,e2e-ee,spec}.{js,ts}': ['stop-only --file'],
  '**/*.{ts,tsx,js,jsx,json}': (files) => {
    const filtered = files.filter((file) => !file.includes('/internal-sdk/'));
    if (filtered.length === 0) return [];

    return [`biome check --write --no-errors-on-unmatched --diagnostic-level=error ${filtered.join(' ')}`];
  },
};
