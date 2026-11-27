import { AgentPlatformEnum } from '../types/agent';
import { INTEGRATION_CONDITION_NAMESPACES } from './integration-conditions';

export const ACCESS_RULE_SUBSCRIBER_FIELDS = [
  'subscriberId',
  'firstName',
  'lastName',
  'email',
  'phone',
  'locale',
  'avatar',
  'timezone',
  'data',
] as const;

export const AGENT_PLATFORMS: readonly AgentPlatformEnum[] = Object.values(AgentPlatformEnum);

export const ACCESS_RULE_CHANNEL_PLATFORM_FIELD = 'channel.platform';

/** Variable namespaces an access rule may use. `isAccessRuleField` narrows them to the fields below. */
export const ACCESS_RULE_NAMESPACES = [...INTEGRATION_CONDITION_NAMESPACES, 'channel.'] as const;

export function isAccessRuleField(field: string): boolean {
  if (field === ACCESS_RULE_CHANNEL_PLATFORM_FIELD) {
    return true;
  }

  const [namespace, key, ...path] = field.split('.');

  if (!key || [key, ...path].some((segment) => segment in Object.prototype)) {
    return false;
  }

  if (namespace === 'subscriber') {
    return key === 'data' || (path.length === 0 && (ACCESS_RULE_SUBSCRIBER_FIELDS as readonly string[]).includes(key));
  }

  if (namespace === 'context') {
    return path[0] === 'data' || (path[0] === 'id' && path.length === 1);
  }

  return false;
}
