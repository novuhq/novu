export function requestLock(id: string, cb: (id: string) => void) {
  let isFullfilled = false;
  let resolve: () => void;

  const promise = new Promise<void>((res) => {
    resolve = res;
  });

  navigator.locks.request(id, () => {
    if (!isFullfilled) {
      cb(id);
    }

    return promise;
  });

  return () => {
    isFullfilled = true;
    resolve();
  };
}
