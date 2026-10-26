import { BridgeError, MissingSecretKeyError, PlatformError } from '../errors';
import { checkIsResponseError } from '../shared';

/** The Node `ServerResponse` surface that Express, Nest and Next.js pages responses share. */
interface NodeResponse {
  statusCode: number;
  setHeader(name: string, value: string): unknown;
  flushHeaders(): void;
  write(chunk: Uint8Array): unknown;
  end(): unknown;
  on(event: 'close', listener: () => void): unknown;
}

/** Writes a streamed action response to a Node response, stopping when the client disconnects. */
export async function pipeToNodeResponse(
  response: NodeResponse,
  { status, headers, body }: { status: number; headers: Record<string, string>; body: ReadableStream<Uint8Array> }
) {
  response.statusCode = status;
  for (const [name, value] of Object.entries(headers)) {
    response.setHeader(name, value);
  }
  // Novu waits for the headers with a timeout, and the first write may come after a long tool call.
  response.flushHeaders();

  const reader = body.getReader();
  response.on('close', () => {
    reader.cancel().catch(() => {});
  });

  for (let chunk = await reader.read(); !chunk.done; chunk = await reader.read()) {
    response.write(chunk.value);
  }
  response.end();
}

export const initApiClient = (secretKey: string, apiUrl: string) => {
  if (!secretKey) {
    throw new MissingSecretKeyError();
  }

  return {
    post: async <T = unknown>(route: string, data: Record<string, unknown>): Promise<T> => {
      const response = await fetch(`${apiUrl}/v1${route}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `ApiKey ${secretKey}`,
        },
        body: JSON.stringify(data),
      });

      const resJson = await response.json();

      if (response.ok) {
        return resJson as T;
      } else if (checkIsResponseError(resJson)) {
        throw new PlatformError(resJson.statusCode, resJson.error, resJson.message);
      } else {
        throw new BridgeError(resJson);
      }
    },
    delete: async <T = unknown>(route: string): Promise<T> => {
      return (
        await fetch(`${apiUrl}/v1${route}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `ApiKey ${secretKey}`,
          },
        })
      ).json() as T;
    },
  };
};
