// Chat SDK packages are ESM-only; SWC rewrites import() → require() for CJS output.
// Wrapping in new Function prevents SWC from seeing the import() keyword.
// eslint-disable-next-line @typescript-eslint/no-implied-eval
export const esmImport = new Function('specifier', 'return import(specifier)') as (s: string) => Promise<any>;
