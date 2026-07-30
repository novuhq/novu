/**
 * /api/grafana-endpoint
 *
 * Server-side companion for the Grafana end-user connect playground page.
 * This route models the "acme backend": the Novu customer's own server
 * that owns the Novu secret key and provisions Grafana endpoints on behalf
 * of its signed-in users.
 *
 * Supported methods:
 *   POST   → provision or rotate the subscriber's Grafana webhook URL.
 *            Body: { subscriberId, url, authToken?, integrationIdentifier? }
 *   GET    → list the subscriber's Grafana endpoints.
 *            Query: subscriberId, integrationIdentifier?
 *   DELETE → remove one endpoint (drops the encrypted webhook URL stored
 *            on the endpoint document in Novu).
 *            Query: identifier
 *
 * Required ENV vars:
 *   NOVU_SECRET_KEY                             Novu API secret (sk_...)
 *   NOVU_API_BASE_URL                           Optional Novu API base URL
 *   NOVU_CONNECT_GRAFANA_INTEGRATION_IDENTIFIER Novu integration identifier for Grafana
 *                                               (fallback when the request body omits it)
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import {
  deleteGrafanaEndpoint,
  ensureGrafanaEndpoint,
  GrafanaEndpoint,
  listGrafanaEndpoints,
} from '@/lib/grafana-endpoint-connect';

type PostBody = {
  subscriberId?: string;
  url?: string;
  authToken?: string;
  integrationIdentifier?: string;
};

type EndpointsResponse = { endpoints: GrafanaEndpoint[] };
type MutateResponse = { endpoint: GrafanaEndpoint; rotated: boolean };
type ErrorResponse = { error: string };
type SuccessResponse = { ok: true };

type ResponseData = EndpointsResponse | MutateResponse | SuccessResponse | ErrorResponse;

function resolveIntegrationIdentifier(explicit: string | undefined): string | null {
  const fromRequest = typeof explicit === 'string' ? explicit.trim() : '';
  if (fromRequest.length > 0) {
    return fromRequest;
  }

  const fromEnv = process.env.NOVU_CONNECT_GRAFANA_INTEGRATION_IDENTIFIER?.trim() ?? '';
  return fromEnv.length > 0 ? fromEnv : null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<ResponseData>) {
  try {
    if (req.method === 'POST') {
      const body = (req.body ?? {}) as PostBody;
      const subscriberId = typeof body.subscriberId === 'string' ? body.subscriberId.trim() : '';

      if (!subscriberId) {
        res.status(400).json({ error: 'subscriberId is required' });
        return;
      }

      const url = typeof body.url === 'string' ? body.url.trim() : '';
      if (!url) {
        res.status(400).json({ error: 'url is required' });
        return;
      }

      const authToken = typeof body.authToken === 'string' ? body.authToken.trim() : '';

      const integrationIdentifier = resolveIntegrationIdentifier(body.integrationIdentifier);
      if (!integrationIdentifier) {
        res.status(400).json({
          error: 'integrationIdentifier is required (body or NOVU_CONNECT_GRAFANA_INTEGRATION_IDENTIFIER env var)',
        });
        return;
      }

      const result = await ensureGrafanaEndpoint({
        subscriberId,
        integrationIdentifier,
        url,
        ...(authToken ? { authToken } : {}),
      });

      if (!result.ok) {
        res.status(result.status ?? 422).json({ error: result.error });
        return;
      }

      res.status(200).json({ endpoint: result.endpoint, rotated: result.rotated });
      return;
    }

    if (req.method === 'GET') {
      const subscriberId = typeof req.query.subscriberId === 'string' ? req.query.subscriberId.trim() : '';
      if (!subscriberId) {
        res.status(400).json({ error: 'subscriberId query parameter is required' });
        return;
      }

      const integrationIdentifier = resolveIntegrationIdentifier(
        typeof req.query.integrationIdentifier === 'string' ? req.query.integrationIdentifier : undefined
      );

      const result = await listGrafanaEndpoints({
        subscriberId,
        // integrationIdentifier is optional on list; pass through only if present so
        // the customer can see every Grafana endpoint for the subscriber if desired.
        ...(integrationIdentifier ? { integrationIdentifier } : {}),
      });

      if (!result.ok) {
        res.status(result.status ?? 500).json({ error: result.error });
        return;
      }

      res.status(200).json({ endpoints: result.endpoints });
      return;
    }

    if (req.method === 'DELETE') {
      const identifier = typeof req.query.identifier === 'string' ? req.query.identifier.trim() : '';
      if (!identifier) {
        res.status(400).json({ error: 'identifier query parameter is required' });
        return;
      }

      const result = await deleteGrafanaEndpoint(identifier);

      if (!result.ok) {
        res.status(result.status ?? 500).json({ error: result.error });
        return;
      }

      res.status(200).json({ ok: true });
      return;
    }

    res.setHeader('Allow', 'GET, POST, DELETE');
    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
}
