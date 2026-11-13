import { WithPassthrough } from './types';

/**
 * Bridge keys whose values are user-controlled and must keep their exact
 * casing. The providers transform known bridge keys to the casing Bird
 * expects, but template parameters, inline `parameters`, `metadata`, and
 * custom header names belong to the caller: renaming `firstName` to
 * `first_name` or `X-Custom` would silently drop template values.
 */
const OPAQUE_BIRD_BRIDGE_KEYS = ['template', 'parameters', 'metadata', 'headers'] as const;

function isOpaqueBirdBridgeKey(key: string): boolean {
  return (OPAQUE_BIRD_BRIDGE_KEYS as readonly string[]).includes(key);
}

function mergeOpaqueBridgeValue(
  opaque: Record<string, unknown>,
  key: (typeof OPAQUE_BIRD_BRIDGE_KEYS)[number],
  value: unknown
): void {
  if (key !== 'headers') {
    opaque[key] = value;
    return;
  }

  const existingHeaders = typeof opaque.headers === 'object' && opaque.headers !== null ? opaque.headers : {};
  const passthroughHeaders = typeof value === 'object' && value !== null ? value : {};
  opaque.headers = {
    ...(existingHeaders as Record<string, string>),
    ...(passthroughHeaders as Record<string, string>),
  };
}

export function splitBirdBridgeData(bridgeProviderData: WithPassthrough<Record<string, unknown>>): {
  known: WithPassthrough<Record<string, unknown>>;
  opaque: Record<string, unknown>;
} {
  const { _passthrough, ...rest } = bridgeProviderData;
  const known: Record<string, unknown> = {};
  const opaque: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(rest)) {
    if (isOpaqueBirdBridgeKey(key)) {
      opaque[key] = value;
    } else {
      known[key] = value;
    }
  }

  const passthroughBody = _passthrough?.body;
  if (passthroughBody && typeof passthroughBody === 'object') {
    for (const key of OPAQUE_BIRD_BRIDGE_KEYS) {
      if (key in passthroughBody) {
        mergeOpaqueBridgeValue(opaque, key, passthroughBody[key]);
      }
    }
  }

  return {
    known: (_passthrough ? { ...known, _passthrough } : known) as WithPassthrough<Record<string, unknown>>,
    opaque,
  };
}

/**
 * Restores opaque bridge values onto the merged body with bridge priority.
 * Header maps merge per key so integration headers extend rather than replace
 * message headers.
 */
export function restoreBirdOpaqueKeys(body: Record<string, unknown>, opaque: Record<string, unknown>): void {
  if (opaque.template !== undefined) {
    body.template = opaque.template;
  }

  if (opaque.parameters !== undefined) {
    body.parameters = opaque.parameters;
  }

  if (opaque.metadata !== undefined) {
    body.metadata = opaque.metadata;
  }

  if (opaque.headers !== undefined) {
    const base = body.headers;
    const baseHeaders = typeof base === 'object' && base !== null ? (base as Record<string, string>) : {};
    body.headers = { ...baseHeaders, ...(opaque.headers as Record<string, string>) };
  }
}
