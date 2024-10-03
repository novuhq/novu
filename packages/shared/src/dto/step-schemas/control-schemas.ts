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
      properties: {
        type: {
          type: 'string',
        },
        content: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              type: {
                type: 'string',
              },
              content: {
                type: 'array',
                items: {
                  $ref: '#/properties/emailEditor/properties/content/items',
                },
              },
              text: {
                type: 'string',
              },
              attr: {
                type: 'object',
                additionalProperties: true,
              },
            },
            required: ['type'],
            additionalProperties: false,
          },
        },
        text: {
          type: 'string',
        },
        attr: {
          type: 'object',
          additionalProperties: true,
        },
      },
      required: ['type'],
      additionalProperties: false,
    },
    subject: {
      type: 'string',
    },
  },
  required: ['emailEditor', 'subject'],
  additionalProperties: false,
};
