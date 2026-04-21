/**
 * Chat SDK packages (`chat`, `@chat-adapter/slack`, `@chat-adapter/teams`)
 * are ESM-only, but this package builds to CJS. Wrapping `import()` inside
 * `new Function` prevents SWC/TS from downgrading it to `require()`, which
 * would fail on ESM modules at runtime.
 */
// eslint-disable-next-line @typescript-eslint/no-implied-eval
export const esmImport = new Function('specifier', 'return import(specifier)') as (s: string) => Promise<any>;
