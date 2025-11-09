import { EnvironmentId } from './environment';
import { OrganizationId } from './organization';

export type Context = {
  _id: string;
  _organizationId: OrganizationId;
  _environmentId: EnvironmentId;

  id: ContextId;
  type: ContextType;
  data: ContextData;

  key: string;

  createdAt: string;
  updatedAt: string;
};

export type ContextType = string;

export type ContextId = string;

export const createContextKey = (type: ContextType, id: ContextId): string => `${type}:${id}`;

export type ContextData = Record<string, unknown>;

export const CONTEXT_IDENTIFIER_REGEX = /^[a-zA-Z0-9_-]+$/;

// Context value can be either a simple string id or a rich object
export type ContextValue =
  | string
  | {
      id: ContextId;
      data?: ContextData;
    };

// Context payload is a record of context types to their values
// Examples:
// { tenant: "org-acme" } - single key with string value
// { tenant: "org-acme", app: "jira" } - multi key with string values
// { tenant: { id: "org-acme", data: { name: "Acme Corp" } } } - single key with rich object
// { tenant: { id: "org-acme", data: {} }, app: "jira" } - mixed values
export type ContextPayload = Partial<Record<ContextType, ContextValue>>;

function isValidId(value: unknown): boolean {
  return typeof value === 'string' && value.length >= 1 && value.length <= 100 && CONTEXT_IDENTIFIER_REGEX.test(value);
}

// Validation functions for context payload
function isValidContextValue(value: unknown): value is ContextValue {
  if (typeof value === 'string') {
    return isValidId(value);
  }

  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    const obj = value as Record<string, unknown>;
    return (
      'id' in obj &&
      typeof obj.id === 'string' &&
      isValidId(obj.id) &&
      (obj.data === undefined || (typeof obj.data === 'object' && obj.data !== null))
    );
  }

  return false;
}

export function isValidContextPayload(context: unknown): context is ContextPayload {
  if (typeof context !== 'object' || context === null || Array.isArray(context)) {
    return false;
  }

  const contextObj = context as Record<string, unknown>;

  // Must have at least one key
  if (Object.keys(contextObj).length === 0) {
    return false;
  }

  // All values must be valid context values
  return Object.values(contextObj).every((value) => isValidContextValue(value));
}
