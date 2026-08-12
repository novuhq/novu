/**
 * Subscriber JWT captured from session init.
 *
 * The sidebar calls one endpoint the SDK does not wrap yet
 * (`GET /v1/agent-chat/conversations`), and it needs the same Bearer token.
 */
let token: string | undefined;

type Listener = (token: string) => void;

const listeners = new Set<Listener>();

export function getApiToken(): string | undefined {
  return token;
}

export function setApiToken(next: string): void {
  if (next === token) return;

  token = next;
  listeners.forEach((listener) => listener(next));
}

export function subscribeApiToken(listener: Listener): () => void {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}
