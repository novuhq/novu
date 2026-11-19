import { ApiAuthSchemeEnum, UserSessionData } from '@novu/shared';

type NewRelicAttributes = Record<string, string | number | boolean>;

type NewRelicAgent = {
  addCustomAttributes?: (attributes: NewRelicAttributes) => void;
};

let nr: NewRelicAgent | null;

try {
  nr = require('newrelic');
} catch {
  nr = null;
}

export function addNewRelicTraceAttributes(session: UserSessionData) {
  addCustomAttributes({
    organizationId: session.organizationId,
    environmentId: session.environmentId,
  });
}

/**
 * Marks every call made with a secret key with where it came from, so the addresses each organization's keys are
 * used from can be listed, and the callers of one key compared with the callers of another.
 */
export function addNewRelicApiKeyRequestAttributes({
  clientIp,
  clientCountry,
}: {
  clientIp?: string;
  clientCountry?: string;
}) {
  addCustomAttributes({
    authScheme: ApiAuthSchemeEnum.API_KEY,
    clientIp,
    clientCountry,
  });
}

/**
 * Marks a call made with a key created before the revocation cutoff, so that use can be counted per organization,
 * key and caller. `fingerprint` is a short prefix of the key's hash: enough to tell keys apart, and never the key.
 */
export function addNewRelicApiKeyRevocationAttributes({
  blocked,
  mode,
  fingerprint,
  keyCreatedAt,
}: {
  blocked: boolean;
  mode: string;
  fingerprint?: string;
  keyCreatedAt?: Date | null;
}) {
  addCustomAttributes({
    apiKeyRequiresRotation: true,
    apiKeyRevocationBlocked: blocked,
    apiKeyRevocationMode: mode,
    apiKeyFingerprint: fingerprint,
    apiKeyCreatedAt: keyCreatedAt?.toISOString(),
  });
}

/** Leaves out the attributes that have no value. */
function addCustomAttributes(attributes: Record<string, string | number | boolean | undefined>) {
  if (!nr || typeof nr.addCustomAttributes !== 'function') return;

  try {
    const known: NewRelicAttributes = {};

    for (const [name, value] of Object.entries(attributes)) {
      if (value !== undefined && value !== '') {
        known[name] = value;
      }
    }

    nr.addCustomAttributes(known);
  } catch {
    // swallow – NR failures must never break authentication
  }
}
