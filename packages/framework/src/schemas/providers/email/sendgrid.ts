import { z } from 'zod';
import { Schema } from '../../../types/schema.types';

/**
 * Sendgrid payload schema
 *
 * @see https://api.slack.com/reference/messaging/payload
 */
export const sendgridOutputSchema = z.object({
  ipPoolName: z.string(),
  customData: z
    .object({
      dynamicTemplateData: z.record(z.string(), z.any()).optional(),
      templateId: z.string().optional(),
    })
    .optional(),
}) satisfies Schema;

export const sendgridProviderSchemas = {
  output: sendgridOutputSchema,
};
