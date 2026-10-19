const STORAGE_VERSION = '1.0.0';
const TTL_DAYS = 90;
const TTL_MS = TTL_DAYS * 24 * 60 * 60 * 1000;

export function saveToStorage<T>(storageKey: string, data: T, dataKey: string): void {
  try {
    const persistedData = {
      [dataKey]: data,
      timestamp: Date.now(),
      version: STORAGE_VERSION,
    };

    localStorage.setItem(storageKey, JSON.stringify(persistedData));
  } catch (error) {
    console.warn(`Failed to save ${dataKey} to localStorage:`, error);
  }
}

export function loadFromStorage<T>(
  storageKey: string,
  dataKey: string,
  { ttl = TTL_MS, version = STORAGE_VERSION }: { ttl?: number; version?: string } = {}
): T | null {
  try {
    const stored = localStorage.getItem(storageKey);

    if (!stored) return null;

    const persistedData = JSON.parse(stored);

    const isExpired = Date.now() - persistedData.timestamp > ttl;

    if (isExpired || persistedData.version !== version) {
      localStorage.removeItem(storageKey);
      return null;
    }

    return persistedData[dataKey] as T;
  } catch (error) {
    console.warn(`Failed to load ${dataKey} from localStorage:`, error);
    return null;
  }
}

export function clearFromStorage(storageKey: string, dataKey: string): void {
  try {
    localStorage.removeItem(storageKey);
  } catch (error) {
    console.warn(`Failed to clear ${dataKey} from localStorage:`, error);
  }
}
