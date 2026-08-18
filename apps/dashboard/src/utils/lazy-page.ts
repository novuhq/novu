import { ComponentType, lazy } from 'react';

const CHUNK_RELOAD_KEY = 'novu:dashboard-chunk-reload';

function isChunkLoadError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  return /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Loading chunk [\d]+ failed/i.test(
    error.message
  );
}

function reloadOnceOnChunkError(error: unknown): never | Promise<never> {
  if (typeof window !== 'undefined' && isChunkLoadError(error) && sessionStorage.getItem(CHUNK_RELOAD_KEY) !== '1') {
    sessionStorage.setItem(CHUNK_RELOAD_KEY, '1');
    window.location.reload();

    return new Promise(() => {});
  }

  throw error;
}

// biome-ignore lint/suspicious/noExplicitAny: named-export lazy() helper must accept arbitrary component props
export function lazyPage<M extends Record<string, ComponentType<any>>, K extends keyof M>(
  importer: () => Promise<M>,
  exportName: K
) {
  return lazy(async () => {
    try {
      const module = await importer();

      if (typeof window !== 'undefined') {
        sessionStorage.removeItem(CHUNK_RELOAD_KEY);
      }

      return { default: module[exportName] };
    } catch (error) {
      return reloadOnceOnChunkError(error);
    }
  });
}
