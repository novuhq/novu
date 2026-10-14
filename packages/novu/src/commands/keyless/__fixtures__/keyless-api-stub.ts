import http from 'node:http';
import type { AddressInfo } from 'node:net';

export type RecordedRequest = {
  method: string;
  path: string;
  headers: http.IncomingHttpHeaders;
  body: unknown;
};

export type StubResponse = { status: number; body: unknown };

export type KeylessApiStub = {
  apiUrl: string;
  requests: RecordedRequest[];
  respond: (route: string, response: StubResponse) => void;
  close: () => Promise<void>;
};

/** Routes are keyed as `METHOD /path`, e.g. `POST /v1/keyless/environments`. Unknown routes return 404. */
export async function startKeylessApiStub(): Promise<KeylessApiStub> {
  const routes = new Map<string, StubResponse>();
  const requests: RecordedRequest[] = [];

  const server = http.createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      const method = req.method ?? 'GET';
      const path = req.url ?? '/';
      requests.push({ method, path, headers: req.headers, body: raw ? JSON.parse(raw) : undefined });

      const response = routes.get(`${method} ${path}`) ?? {
        status: 404,
        body: { statusCode: 404, message: 'Not Found' },
      };
      res.writeHead(response.status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(response.body));
    });
  });

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;

  return {
    apiUrl: `http://127.0.0.1:${port}`,
    requests,
    respond: (route, response) => routes.set(route, response),
    close: () => new Promise((resolve) => server.close(() => resolve())),
  };
}
