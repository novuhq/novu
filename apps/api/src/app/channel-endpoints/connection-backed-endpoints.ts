import { ChannelEndpointType, ENDPOINT_TYPES } from '@novu/shared';

/**
 * Endpoint types whose wire shape is persisted encrypted on a dedicated,
 * 1:1-owned `ChannelConnection.auth` instead of the `ChannelEndpoint.endpoint`
 * document (which stays `{}`). Read paths re-hydrate the wire shape from the
 * decrypted connection auth; delete cascades to the owned connection.
 */
export interface ConnectionBackedEndpointConfig {
  /** Human-readable provider label used in error messages. */
  label: string;
  /** Stub workspace persisted on the owned ChannelConnection. */
  workspace: { id: string; name: string };
  /** Wire-shape fields re-hydrated from the decrypted connection auth on read. */
  wireFields: readonly string[];
}

const CONNECTION_BACKED_ENDPOINTS: Partial<Record<ChannelEndpointType, ConnectionBackedEndpointConfig>> = {
  [ENDPOINT_TYPES.PAGERDUTY_SERVICE]: {
    label: 'PagerDuty',
    workspace: { id: 'pagerduty', name: 'PagerDuty' },
    wireFields: ['routingKey', 'region'],
  },
  [ENDPOINT_TYPES.OPSGENIE_INTEGRATION]: {
    label: 'Opsgenie',
    workspace: { id: 'opsgenie', name: 'Opsgenie' },
    wireFields: ['apiKey', 'region'],
  },
};

export function getConnectionBackedEndpointConfig(
  type: ChannelEndpointType
): ConnectionBackedEndpointConfig | undefined {
  return CONNECTION_BACKED_ENDPOINTS[type];
}

/**
 * Rebuild the wire-shape endpoint object from a decrypted connection auth.
 * Returns null when the auth is missing any wire field, so callers can fall
 * back to the stored (empty) endpoint document instead of returning a
 * partially hydrated shape.
 */
export function extractWireEndpointFromAuth(
  type: ChannelEndpointType,
  auth: Record<string, unknown>
): Record<string, unknown> | null {
  const config = CONNECTION_BACKED_ENDPOINTS[type];
  if (!config) {
    return null;
  }

  const wireEndpoint: Record<string, unknown> = {};
  for (const field of config.wireFields) {
    const value = auth[field];
    if (value === undefined || value === null || value === '') {
      return null;
    }
    wireEndpoint[field] = value;
  }

  return wireEndpoint;
}
