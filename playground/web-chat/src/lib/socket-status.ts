/**
 * Live socket state for the header pill.
 *
 * The SDK only emits `socket.connect.pending` and `socket.connect.resolved`; a socket
 * that drops after a successful open emits nothing. The WebSocket patch in
 * `debug-events.ts` is the only place that sees `close`, so it reports here.
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
