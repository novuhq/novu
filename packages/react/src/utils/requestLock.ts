export function requestLock(id: string, cb: (id: string) => void) {
  // Check if the Lock API is available
  if (!('locks' in navigator)) {
    // If Lock API is not available, immediately invoke the callback and return a no-op function
    cb(id);
    return () => {};
  }

  let isFulfilled = false;
  let promiseResolve: () => void;

  const promise = new Promise<void>((resolve) => {
    promiseResolve = resolve;
  });

  navigator.locks.request(id, () => {
    if (!isFulfilled) {
      cb(id);
    }

    return promise;
  });

  return () => {
    isFulfilled = true;
    promiseResolve();
  };
}
