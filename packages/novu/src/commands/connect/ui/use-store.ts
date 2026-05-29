import type { ReadableAtom } from 'nanostores';
import { useEffect, useState } from 'react';

export function useStore<T>(store: ReadableAtom<T>): T {
  const [value, setValue] = useState<T>(() => store.get());
  useEffect(() => store.subscribe(setValue), [store]);

  return value;
}
