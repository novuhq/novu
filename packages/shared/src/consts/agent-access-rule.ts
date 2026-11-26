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

export function isAccessRuleField(field: string): boolean {
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
