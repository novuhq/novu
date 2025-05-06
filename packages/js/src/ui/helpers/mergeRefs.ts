import { Ref } from 'solid-js';

function chain<Args extends [] | any[]>(callbacks: {
  [Symbol.iterator](): IterableIterator<((...args: Args) => any) | undefined>;
}): (...args: Args) => void {
  return (...args: Args) => {
    for (const callback of callbacks) callback && callback(...args);
  };
}

export function mergeRefs<T>(...refs: Ref<T>[]): (el: T) => void {
  return chain(refs as ((el: T) => void)[]);
}
