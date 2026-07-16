import { decryptChannelConnectionAuth, validateEndpointForTypeFromSchema } from '@novu/application-generic';
import { ChannelConnectionEntity, ChannelEndpointEntity } from '@novu/dal';
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
}

const CONNECTION_BACKED_ENDPOINTS: Partial<Record<ChannelEndpointType, ConnectionBackedEndpointConfig>> = {
  [ENDPOINT_TYPES.PAGERDUTY_SERVICE]: {
    label: 'PagerDuty',
    workspace: { id: 'pagerduty', name: 'PagerDuty' },
  },
  [ENDPOINT_TYPES.OPSGENIE_INTEGRATION]: {
    label: 'Opsgenie',
    workspace: { id: 'opsgenie', name: 'Opsgenie' },
  },
};

export function getConnectionBackedEndpointConfig(
  type: ChannelEndpointType
): ConnectionBackedEndpointConfig | undefined {
  return CONNECTION_BACKED_ENDPOINTS[type];
}

export function isConnectionBackedEndpoint(type: ChannelEndpointType): boolean {
  return type in CONNECTION_BACKED_ENDPOINTS;
}

/**
 * Re-hydrate a connection-backed endpoint's wire shape from its linked
 * connection. The write path persists the wire shape verbatim (encrypted) as
 * the connection auth, so the decrypted auth IS the wire endpoint; the
 * canonical endpoint schema validates it before it is returned, falling back
 * to the stored (empty) endpoint document rather than exposing a malformed
 * shape. Existing platform convention returns decrypted secrets from the API;
 * the dashboard masks client-side.
 */
export function hydrateEndpointFromConnection(
  endpoint: ChannelEndpointEntity,
  connection: ChannelConnectionEntity | undefined | null
): ChannelEndpointEntity {
  if (!connection?.auth) {
    return endpoint;
  }

  const decrypted = decryptChannelConnectionAuth(connection.auth) as Record<string, unknown> | null;

  if (!decrypted || !validateEndpointForTypeFromSchema(endpoint.type, decrypted)) {
    return endpoint;
  }

  return { ...endpoint, endpoint: decrypted } as ChannelEndpointEntity;
}
