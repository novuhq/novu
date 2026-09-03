/**
 * Live socket state for the header pill.
 *
 * ConnectionTracker writes this store from SDK events only:
 * `socket.connect.pending`, `socket.connect.resolved`, `socket.disconnect.resolved`.
 */
export type SocketStatus = 'connecting' | 'online' | 'offline';

let current: SocketStatus = 'connecting';

type Listener = (status: SocketStatus) => void;

const listeners = new Set<Listener>();

export function getSocketStatus(): SocketStatus {
  return current;
}

export function setSocketStatus(status: SocketStatus): void {
  if (status === current) return;

  current = status;
  listeners.forEach((listener) => listener(current));
}

export function subscribeSocketStatus(listener: Listener): () => void {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}
