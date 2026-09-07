// Chat SDK adapters (`@chat-adapter/*`) are ESM-only; when this package is built as
// CommonJS the compiler rewrites `import()` → `require()`, which cannot load an ESM
// module. Wrapping in `new Function` hides the `import()` keyword from the compiler so
// it survives as a real dynamic import at runtime.
// eslint-disable-next-line @typescript-eslint/no-implied-eval
export const esmImport = new Function('specifier', 'return import(specifier)') as <T = any>(
  specifier: string
) => Promise<T>;
