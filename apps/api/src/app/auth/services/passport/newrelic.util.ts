import { UserSessionData } from '@novu/shared';

type NewRelicAgent = {
  addCustomAttributes?: (attributes: Record<string, string | number | boolean>) => void;
};

let nr: NewRelicAgent | null;

try {
  nr = require('newrelic');
} catch {
  nr = null;
}

export function addNewRelicTraceAttributes(session: Pick<UserSessionData, 'organizationId' | 'environmentId'>) {
  if (!nr || typeof nr.addCustomAttributes !== 'function') return;

  try {
    nr.addCustomAttributes({
      organizationId: session.organizationId,
      environmentId: session.environmentId,
    });
  } catch {
    // swallow – NR failures must never break authentication
  }
}

/**
 * Marks a transaction with the caller's network and the ending of the secret key it sent. Routes that are too busy
 * for an access line can then still be watched per IP and per key.
 */
export function addNewRelicRequestAttributes(attributes: {
  clientIp?: string;
  country?: string;
  apiKeyLast4?: string;
}) {
  if (!nr || typeof nr.addCustomAttributes !== 'function') return;

  const known: Record<string, string> = {};

  for (const [name, value] of Object.entries(attributes)) {
    if (value !== undefined) known[name] = value;
  }

  try {
    nr.addCustomAttributes(known);
  } catch {
    // swallow – NR failures must never break a request
  }
}

/** Marks a call made with a key created before the revocation cutoff, so that use can be counted per organization. */
export function addNewRelicApiKeyRevocationAttributes({ blocked }: { blocked: boolean }) {
  if (!nr || typeof nr.addCustomAttributes !== 'function') return;

  try {
    nr.addCustomAttributes({
      apiKeyRequiresRotation: true,
      apiKeyRevocationBlocked: blocked,
    });
  } catch {
    // swallow – NR failures must never break authentication
  }
}

/**
 * Marks a session whose subscriber hash was signed with a key created before the revocation cutoff. Sessions carry no
 * API key, so their organization and environment are added too.
 */
export function addNewRelicOldKeyHashAttributes({
  blocked,
  source,
  organizationId,
  environmentId,
}: {
  blocked: boolean;
  source: string;
  organizationId: string;
  environmentId: string;
}) {
  if (!nr || typeof nr.addCustomAttributes !== 'function') return;

  try {
    nr.addCustomAttributes({
      apiKeyRequiresRotation: true,
      apiKeyRevocationBlocked: blocked,
      apiKeyRevocationHashSource: source,
      organizationId,
      environmentId,
    });
  } catch {
    // swallow – NR failures must never break a session
  }
}
