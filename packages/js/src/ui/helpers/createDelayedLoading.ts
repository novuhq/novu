import { Accessor, createEffect, createMemo, createSignal, onCleanup, Setter } from 'solid-js';

export function createDelayedLoading(initialValue: boolean, delayInMs: number): [Accessor<boolean>, Setter<boolean>] {
  const [debouncedValue, setDebouncedValue] = createSignal(initialValue);
  const [valueGiven, setValueGiven] = createSignal(initialValue);
  const [initialDelayHasPassed, setInitialDelayHasPassed] = createSignal(false);

  const timeout = setTimeout(() => {
    setInitialDelayHasPassed(true);
  }, delayInMs);

  onCleanup(() => {
    clearTimeout(timeout);
  });

  createEffect(() => {
    if (initialDelayHasPassed()) {
      setDebouncedValue(valueGiven());
    }
  });

  const setValue = createMemo(() => {
    if (!initialDelayHasPassed()) {
      return setValueGiven;
    }

    return setDebouncedValue;
  });

  return [debouncedValue, setValue()];
}
