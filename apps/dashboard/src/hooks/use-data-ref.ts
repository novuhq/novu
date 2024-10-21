import { useRef } from 'react';

export const useDataRef = <T>(data: T) => {
  const ref = useRef<T>(data);
  ref.current = data;

  return ref;
};
