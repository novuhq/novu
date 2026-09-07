import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

export function resolvePackageFile(specifier: string): string {
  return require.resolve(specifier);
}
