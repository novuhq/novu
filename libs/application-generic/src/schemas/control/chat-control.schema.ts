import { JSONSchemaEntity } from '@novu/dal';
import { UiComponentEnum, UiSchema, UiSchemaGroupEnum } from '@novu/shared';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { defaultOptions, skipStepUiSchema, skipZodSchema } from './shared';

/**
 * Loose passthrough schema for the structured chat `card` tree.
 *
 * Shape mirrors the `CardElement` type from the `chat` package (re-exported
 * from `@novu/framework`). We keep it loose on purpose — the runtime compiler
 * (`ChatContentCompiler`) validates and normalizes via the upstream package,
 * which is the source of truth for the card grammar.
 */
const cardElementZodSchema: z.ZodType<Record<string, unknown>> = z
  .object({
    type: z.literal('card'),
    title: z.string().optional(),
    subtitle: z.string().optional(),
    imageUrl: z.string().optional(),
    children: z.array(z.record(z.any())),
  })
  .passthrough();

export const chatControlZodSchema = z
  .object({
    skip: skipZodSchema,
    body: z.string(),
    /**
     * Optional rich-content card tree. When present, `SendMessageChat` compiles
     * it to Slack Block Kit / Teams Adaptive Cards / Discord embeds; `body`
     * stays the text fallback for providers that don't understand rich payloads.
     */
    card: cardElementZodSchema.optional(),
    /**
     * When true, providers that can't render the card will NOT fall back to
     * the plain-text `body`. Default false — most customers want the graceful
     * degradation to text.
     */
    disableFallback: z.boolean().optional(),
  })
  .strict();

export type ChatControlType = z.infer<typeof chatControlZodSchema>;

export const chatControlSchema = zodToJsonSchema(chatControlZodSchema, defaultOptions) as JSONSchemaEntity;
export const chatUiSchema: UiSchema = {
  group: UiSchemaGroupEnum.CHAT,
  properties: {
    body: {
      component: UiComponentEnum.CHAT_RICH_BODY,
    },
    card: {
      component: UiComponentEnum.CHAT_RICH_BODY,
    },
    skip: skipStepUiSchema.properties.skip,
  },
};
