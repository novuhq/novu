import { useEffect, useRef } from 'react';

export const useEffectOnce = (effect: () => void, condition: boolean) => {
  const didRunRef = useRef(false);
  const effectRef = useRef(effect);
  effectRef.current = effect;

  useEffect(() => {
    if (condition && !didRunRef.current) {
      didRunRef.current = true;
      effectRef.current();
    }
  }, [condition]);
};
