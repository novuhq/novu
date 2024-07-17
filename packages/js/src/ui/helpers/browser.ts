export function requestLock(id: string, cb: (id: string) => void) {
  let resolve: () => void;

  const promise = new Promise<void>((res) => {
    resolve = res;
  });

  navigator.locks.request(id, () => {
    cb(id);
    return promise;
  });

  return () => resolve();
}
