import { RiErrorWarningLine } from 'react-icons/ri';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/primitives/tooltip';
import {
  type AnnotateOverrideField,
  type DescribeOverrideField,
  type OverrideFieldSchema,
} from '@/components/workflow-editor/steps/shared/provider-overrides/override-field-schema';
import { formatWebhookSchemaSourceLabel, type WebhookFieldSchema } from './webhook-payload-schema';

/**
 * Webhook override fields are derived from each integration's own `payloadSchema`, so they carry
 * provenance the generic schema shape knows nothing about. These read it back off the field.
 */
function readWebhookField(fieldSchema: OverrideFieldSchema): Partial<WebhookFieldSchema> {
  return fieldSchema as Partial<WebhookFieldSchema>;
}

export const describeWebhookField: DescribeOverrideField = (_key, fieldSchema) => {
  const { sources = [], conflicts = [] } = readWebhookField(fieldSchema);
  const lines: string[] = [];

  if (sources.length > 0) {
    lines.push(`Sources: ${sources.map(formatWebhookSchemaSourceLabel).join(', ')}`);
  }

  if (conflicts.length > 0) {
    lines.push(
      `Type conflict: ${conflicts
        .map(({ source, type }) => `${formatWebhookSchemaSourceLabel(source)}: ${type}`)
        .join(', ')}`
    );
  }

  return lines;
};

export const annotateWebhookField: AnnotateOverrideField = (key, fieldSchema) => {
  const { sources = [], conflicts = [] } = readWebhookField(fieldSchema);

  return {
    badge:
      conflicts.length > 0 ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="text-warning-base inline-flex" role="img" aria-label={`Conflicting types for ${key}`}>
              <RiErrorWarningLine className="size-3.5" />
            </span>
          </TooltipTrigger>
          <TooltipContent>
            {conflicts.map(({ source, type }) => `${formatWebhookSchemaSourceLabel(source)}: ${type}`).join(' · ')}
          </TooltipContent>
        </Tooltip>
      ) : undefined,
    footnote:
      sources.length > 0 ? (
        <span className="text-text-soft text-[11px]">
          From {sources.map(formatWebhookSchemaSourceLabel).join(', ')}
        </span>
      ) : undefined,
  };
};
