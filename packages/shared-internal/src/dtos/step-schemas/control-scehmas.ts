import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

export const TiptapNodeSchema = z.object({
  type: z.string(), // The type of the node must be a string
  content: z.array(z.lazy(() => TiptapNodeSchema)).optional(), // Optional array of nested TiptapNodes
  text: z.string().optional(), // Optional text property
  attr: z.record(z.any()).optional(), // Optional attributes as a record of key-value pairs
});
export const EmailStepControlSchema = z.object({
  emailEditor: TiptapNodeSchema, // Nested TiptapNodeSchema
  subject: z.string(), // Subject must be a string
});
export type EmailStepControlSchemaDto = z.infer<typeof EmailStepControlSchema>;
export type TipTapNodeSchemaDto = z.infer<typeof TiptapNodeSchema>;
export const CUSTOM_COMPONENT_EXTENSION = 'x-novu-custom-component';
export enum CustomComponentsEnum {
  EMAIL_EDITOR = 'EMAIL_EDITOR',
  TEXT_AREA = 'TEXT_FIELD',
}
export const EmailStepControlJsonSchema = zodToJsonSchema(EmailStepControlSchema);
// @ts-ignore
EmailStepControlJsonSchema.definitions?.emailEditor[CUSTOM_COMPONENT_EXTENSION] = 'email-editor';
