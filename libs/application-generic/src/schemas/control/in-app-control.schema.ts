import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import {
  JSONSchemaDto,
  UiComponentEnum,
  UiSchema,
  UiSchemaGroupEnum,
} from '@novu/shared';
import { defaultOptions, skipStepUiSchema, skipZodSchema } from './shared';

/**
 * Regex pattern for validating URLs with template variables. Matches three cases:
 *
 * 1. URLs that start with template variables like {{variable}}
 *    - Example: {{variable}}, {{variable}}/path
 *
 * 2. Full URLs that may contain template variables
 *    - Excludes mailto: links
 *    - Example: https://example.com, https://example.com/{{variable}}, https://{{variable}}.com
 *
 * 3. Paths starting with / that may contain template variables
 *    - Example: /path/to/page, /path/{{variable}}/page
 *
 * Pattern is optimized to prevent exponential backtracking while maintaining all functionality
 */
const redirectUrlRegex =
  /^(?:\{\{[^}]*\}\}.*|(?!mailto:)(?:https?:\/\/[^\s/$.?#][^\s]*(?:\{\{[^}]*\}\})*[^\s]*)|\/[^\s]*(?:\{\{[^}]*\}\})*[^\s]*)$/;

const redirectZodSchema = z.object({
  url: z.string().regex(redirectUrlRegex),
  target: z
    .enum(['_self', '_blank', '_parent', '_top', '_unfencedTop'])
    .default('_blank'),
});

const actionZodSchema = z
  .object({
    label: z.string(),
    redirect: redirectZodSchema.optional(),
  })
  .optional();

export const inAppControlZodSchema = z.object({
  skip: skipZodSchema,
  disableOutputSanitization: z.boolean().optional(),
  subject: z.string().optional(),
  body: z.string(),
  avatar: z.string().regex(redirectUrlRegex).optional(),
  primaryAction: actionZodSchema,
  secondaryAction: actionZodSchema,
  data: z.object({}).catchall(z.unknown()).optional(),
  redirect: redirectZodSchema.optional(),
});

export type InAppRedirectType = z.infer<typeof redirectZodSchema>;
export type InAppActionType = z.infer<typeof actionZodSchema>;
export type InAppControlType = z.infer<typeof inAppControlZodSchema>;

export const inAppRedirectSchema = zodToJsonSchema(
  redirectZodSchema,
  defaultOptions,
) as JSONSchemaDto;
export const inAppActionSchema = zodToJsonSchema(
  actionZodSchema,
  defaultOptions,
) as JSONSchemaDto;
export const inAppControlSchema = zodToJsonSchema(
  inAppControlZodSchema,
  defaultOptions,
) as JSONSchemaDto;

const redirectPlaceholder = {
  url: {
    placeholder: '',
  },
  target: {
    placeholder: '_self',
  },
};

export const inAppUiSchema: UiSchema = {
  group: UiSchemaGroupEnum.IN_APP,
  properties: {
    body: {
      component: UiComponentEnum.IN_APP_BODY,
      placeholder: '',
    },
    avatar: {
      component: UiComponentEnum.IN_APP_AVATAR,
      placeholder: '',
    },
    subject: {
      component: UiComponentEnum.IN_APP_SUBJECT,
      placeholder: '',
    },
    primaryAction: {
      component: UiComponentEnum.IN_APP_BUTTON_DROPDOWN,
      placeholder: null,
    },
    secondaryAction: {
      component: UiComponentEnum.IN_APP_BUTTON_DROPDOWN,
      placeholder: null,
    },
    redirect: {
      component: UiComponentEnum.URL_TEXT_BOX,
      placeholder: redirectPlaceholder,
    },
    skip: skipStepUiSchema.properties.skip,
    disableOutputSanitization: {
      component: UiComponentEnum.IN_APP_DISABLE_SANITIZATION_SWITCH,
      placeholder: false,
    },
  },
};
