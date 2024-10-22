/* eslint-disable @typescript-eslint/naming-convention */
import { JSONSchema } from 'json-schema-to-ts';

export interface TipTapNode {
  type: string;
  content?: TipTapNode[];
  text?: string;
  attr?: Record<string, unknown>;
}

export interface EmailStepControlSchemaDto {
  emailEditor: TipTapNode;
  subject: string;
}

export enum CustomComponentsEnum {
  EMAIL_EDITOR = 'EMAIL_EDITOR',
  TEXT_AREA = 'TEXT_FIELD',
}

export const EmailStepControlSchema: JSONSchema = {
  type: 'object',
  properties: {
    emailEditor: {
      type: 'object',
      additionalProperties: true, // Allows any properties in emailEditor
    },
    subject: {
      type: 'string',
    },
  },
  required: ['emailEditor', 'subject'],
  additionalProperties: false,
};
