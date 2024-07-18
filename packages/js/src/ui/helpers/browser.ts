export function requestLock(id: string, cb: (id: string) => void) {
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
