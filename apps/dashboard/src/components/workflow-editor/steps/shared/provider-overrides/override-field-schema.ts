import { getProviderOverrideSchema } from '@novu/shared';
import { type ReactNode } from 'react';

/**
 * The JSON Schema subset the override editor understands. Structural only — channel-specific
 * annotations (for example the tool webhook's per-integration sources) are attached by the caller
 * as extra properties and read back through the `describe*` hooks.
 */
export type OverrideFieldSchema = {
  type?: string;
  description?: string;
  enum?: readonly string[];
  maxLength?: number;
  items?: OverrideFieldSchema;
  properties?: Record<string, OverrideFieldSchema>;
};

/** Extra `info` lines a channel can contribute to a completion popup. */
export type DescribeOverrideField = (key: string, fieldSchema: OverrideFieldSchema) => string[];

/** Extra nodes a channel can contribute to a row of the supported-fields popover. */
export type OverrideFieldAnnotations = {
  badge?: ReactNode;
  footnote?: ReactNode;
};

export type AnnotateOverrideField = (key: string, fieldSchema: OverrideFieldSchema) => OverrideFieldAnnotations;

export function getEagerRootSchema(providerId: string): OverrideFieldSchema | undefined {
  return getProviderOverrideSchema(providerId) as OverrideFieldSchema | undefined;
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
