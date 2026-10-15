import { createHash } from 'node:crypto';
import type { EnvironmentEntity } from '@novu/dal';

import { CONNECT_CLAIM_TOKEN_TTL_SECONDS } from '../connect/services/connect-claim-token.service';
import { parsePositiveIntEnv } from './keyless-abuse.constants';
import { isKeylessOrganization } from './keyless-organization.helpers';

export const KEYLESS_AGENT_ENVIRONMENT_NAME_PREFIX = 'Keyless Agent ';
export const KEYLESS_AGENT_DEFAULT_RETENTION_HOURS = 72;
export const KEYLESS_AGENT_DEFAULT_SOURCE = 'unknown';
export const KEYLESS_AGENT_MAX_CLAIM_TOKEN_TTL_SECONDS = CONNECT_CLAIM_TOKEN_TTL_SECONDS;

export enum KeylessAgentErrorCodeEnum {
  DISABLED = 'keyless_disabled',
  ENVIRONMENT_NOT_FOUND = 'keyless_environment_not_found',
  RATE_LIMITED = 'keyless_rate_limited',
  CAPACITY_REACHED = 'keyless_capacity_reached',
  UNAVAILABLE = 'keyless_unavailable',
  ENVIRONMENT_CLAIMED = 'keyless_environment_claimed',
  ENVIRONMENT_EXPIRED = 'keyless_environment_expired',
  REQUIRES_ACCOUNT = 'keyless_requires_account',
  TRIGGER_LIMIT_REACHED = 'keyless_trigger_limit_reached',
  CLAIM_WORKFLOW_EXISTS = 'claim_workflow_exists',
  CLAIM_INTO_KEYLESS_ORG = 'claim_into_keyless_org',
}

const KEYLESS_INBOX_DEMO_IDENTIFIER_PREFIX = 'pk_keyless_';
const HOUR_MS = 60 * 60 * 1000;

export function isKeylessAgentEnvironmentsSupported(): boolean {
  const isEnterprise = process.env.NOVU_ENTERPRISE === 'true' || process.env.CI_EE_TEST === 'true';

  return (
    isEnterprise &&
    process.env.IS_SELF_HOSTED !== 'true' &&
    Boolean(process.env.KEYLESS_ORGANIZATION_ID) &&
    Boolean(process.env.KEYLESS_USER_EMAIL)
  );
}

export function resolveKeylessAgentRetentionHours(): number {
  return parsePositiveIntEnv(
    process.env.KEYLESS_AGENT_ENVIRONMENT_RETENTION_HOURS,
    KEYLESS_AGENT_DEFAULT_RETENTION_HOURS
  );
}

export function isKeylessAgentEnvironment(
  env: Pick<EnvironmentEntity, '_organizationId' | 'identifier' | 'name'>
): boolean {
  return (
    isKeylessOrganization(env._organizationId) &&
    !env.identifier.startsWith(KEYLESS_INBOX_DEMO_IDENTIFIER_PREFIX) &&
    env.name.startsWith(KEYLESS_AGENT_ENVIRONMENT_NAME_PREFIX)
  );
}

export function getKeylessAgentEnvironmentExpiresAt(createdAt: Date | string): Date {
  return new Date(new Date(createdAt).getTime() + resolveKeylessAgentRetentionHours() * HOUR_MS);
}

export function isKeylessAgentEnvironmentExpired(createdAt: Date | string, now: Date = new Date()): boolean {
  return now.getTime() >= getKeylessAgentEnvironmentExpiresAt(createdAt).getTime();
}

export function getKeylessAgentClaimTokenTtlSeconds(createdAt: Date | string, now: Date = new Date()): number {
  const remainingSeconds = Math.floor(
    (getKeylessAgentEnvironmentExpiresAt(createdAt).getTime() - now.getTime()) / 1000
  );

  return Math.max(1, Math.min(KEYLESS_AGENT_MAX_CLAIM_TOKEN_TTL_SECONDS, remainingSeconds));
}

export function hashApiKey(apiKey: string): string {
  return createHash('sha256').update(apiKey).digest('hex');
}
