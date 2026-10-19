import { useCallback, useEffect, useState } from 'react';
import { loadFromStorage, saveToStorage } from '@/utils/local-storage';

const STORAGE_KEY = 'novu-page-sizes';
const DATA_KEY = 'pageSizeMap';

type PageSizeMap = Record<string, number>;

function getPageSizeMap(): PageSizeMap {
  return loadFromStorage<PageSizeMap>(STORAGE_KEY, DATA_KEY) || {};
}

function savePageSizeMap(map: PageSizeMap): void {
  saveToStorage(STORAGE_KEY, map, DATA_KEY);
}

type UsePersistedPageSizeOptions = {
  tableId: string;
  defaultPageSize?: number;
};

type UsePersistedPageSizeReturn = {
  pageSize: number;
  setPageSize: (size: number) => void;
};

export function usePersistedPageSize(options: UsePersistedPageSizeOptions): UsePersistedPageSizeReturn {
  const { tableId, defaultPageSize = 10 } = options;

  const [pageSize, setPageSizeState] = useState<number>(() => {
    const map = getPageSizeMap();

    return map[tableId] ?? defaultPageSize;
  });

  useEffect(() => {
    const map = getPageSizeMap();
    const stored = map[tableId];

    if (stored !== undefined && stored !== pageSize) {
      setPageSizeState(stored);
    }
  }, [tableId, pageSize]);

  const setPageSize = useCallback(
    (size: number) => {
      setPageSizeState(size);
      const map = getPageSizeMap();
      map[tableId] = size;
      savePageSizeMap(map);
    },
    [tableId]
  );

  return {
    pageSize,
    setPageSize,
  };
}

export function getPersistedPageSize(tableId: string, defaultPageSize = 10): number {
  const map = getPageSizeMap();

  return map[tableId] ?? defaultPageSize;
}
