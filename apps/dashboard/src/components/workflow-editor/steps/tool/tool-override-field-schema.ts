import { getToolProviderOverrideSchema } from '@novu/shared';
import { type DashboardToolContentOverrideProviderId, WEBHOOK_TOOL_PROVIDER_ID } from './tool-content-source';
import { type WebhookSchemaConflict, type WebhookSchemaSourceRef } from './webhook-payload-schema';

export type OverrideFieldSchema = {
  type?: string;
  description?: string;
  enum?: readonly string[];
  maxLength?: number;
  items?: OverrideFieldSchema;
  properties?: Record<string, OverrideFieldSchema>;
  sources?: WebhookSchemaSourceRef[];
  conflicts?: WebhookSchemaConflict[];
};

export function getFieldSchemas(
  providerId: DashboardToolContentOverrideProviderId
): Record<string, OverrideFieldSchema> {
  if (providerId === WEBHOOK_TOOL_PROVIDER_ID) {
    return {};
  }

  const schema = getToolProviderOverrideSchema(providerId);

  return (schema?.properties ?? {}) as Record<string, OverrideFieldSchema>;
}

export function getTypeLabel(fieldSchema: OverrideFieldSchema): string {
  if (fieldSchema.type === 'array') {
    return fieldSchema.items?.type ? `${fieldSchema.items.type}[]` : 'array';
  }

  return fieldSchema.type ?? 'any';
}

export function getConstraints(fieldSchema: OverrideFieldSchema): string[] {
  const constraints: string[] = [];

  if (fieldSchema.enum && fieldSchema.enum.length > 0) {
    constraints.push(`One of: ${fieldSchema.enum.join(', ')}`);
  }

  if (fieldSchema.maxLength !== undefined) {
    constraints.push(`Max ${fieldSchema.maxLength.toLocaleString()} characters`);
  }

  return constraints;
}

export function defaultValueForFieldSchema(fieldSchema: OverrideFieldSchema | undefined): unknown {
  if (fieldSchema?.enum && fieldSchema.enum.length > 0) {
    return fieldSchema.enum[0];
  }

  switch (fieldSchema?.type) {
    case 'array':
      return [];
    case 'object':
      return {};
    case 'number':
    case 'integer':
      return 0;
    case 'boolean':
      return false;
    default:
      return '';
  }
}

export function getToolOverrideFieldDefaultValue(
  providerId: DashboardToolContentOverrideProviderId,
  key: string,
  fieldSchemas?: Record<string, OverrideFieldSchema>
): unknown {
  return defaultValueForFieldSchema((fieldSchemas ?? getFieldSchemas(providerId))[key]);
}
