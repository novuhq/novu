export function requestLock(id: string, cb: (id: string) => void) {
  // Check if the Lock API is available
  if (!('locks' in navigator)) {
    cb(id);

    return () => {};
  }

  let isFulfilled = false;
  let releaseLock: () => void;

  const promise = new Promise<void>((resolve) => {
    releaseLock = resolve;
  });

  navigator.locks.request(id, async () => {
    if (!isFulfilled) {
      cb(id);
    }

    await promise;
  });

  return () => {
    isFulfilled = true;
    releaseLock();
  };
}
