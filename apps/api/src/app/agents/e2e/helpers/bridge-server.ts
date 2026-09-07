/**
 * In-process bridge server for agent e2e tests.
 *
 * Spins up `@novu/framework/express`'s `serve()` handler with a real `agent()`
 * registration so the API's `BridgeExecutorService` can fire genuine HTTP calls
 * into a configurable `onMessage` / `onAction` / `onResolve` flow. Exposed as a
 * helper so tests can vary handler behavior per-scenario without rebuilding the
 * mocha-level bootstrap.
 *
 * Notes:
 *
 * - Binds on `0.0.0.0` (matching the existing `TestBridgeServer` convention)
 *   so the API's `safeOutboundJsonRequest` path can reach it; `0.0.0.0` is in
 *   the `NOVU_SAFE_OUTBOUND_TEST_ALLOW_IPS` allow-list configured in
 *   `.env.test:172`.
 * - `client.secretKey` is the API key passed in by the test (resolved off the
 *   `UserSession`). The bridge SDK uses it as `Authorization: ApiKey ...` when
 *   calling back into `/v1/agents/:id/reply`, so it must match the test
 *   environment's API key for the reply to authenticate.
 * - `strictAuthentication: false` mirrors the existing `TestBridgeServer` and
 *   `mock-agent-handler` posture so we don't have to forge HMAC signatures from
 *   the bridge side too.
 */

import http from 'node:http';
import { agent, Client, serve } from '@novu/framework/express';
import express from 'express';
import getPort from 'get-port';

type AgentHandlers = Parameters<typeof agent>[1];

export interface BridgeServerHandle {
  url: string;
  port: number;
  close: () => Promise<void>;
}

export async function startBridgeServer(opts: {
  agentId: string;
  handlers: AgentHandlers;
  secretKey: string;
}): Promise<BridgeServerHandle> {
  const port = await getPort();
  const app = express();

  app.use(express.json({ limit: '10mb' }));

  const novuAgent = agent(opts.agentId, opts.handlers);

  app.use(
    '/api/novu',
    serve({
      agents: [novuAgent],
      client: new Client({
        secretKey: opts.secretKey,
        strictAuthentication: false,
      }),
    })
  );

  const server: http.Server = await new Promise((resolve, reject) => {
    const s = app.listen(port, '0.0.0.0', () => resolve(s));
    s.once('error', reject);
  });

  return {
    port,
    url: `http://0.0.0.0:${port}/api/novu`,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      }),
  };
}
