/* eslint-disable @typescript-eslint/naming-convention */
import { JSONSchemaDto } from './json-schema-dto';

export interface TipTapNode {
  type: string;
  content?: TipTapNode[];
  text?: string;
  attr?: Record<string, unknown>;
}

export interface EmailStepControlSchemaDto {
  emailEditor: string;
  subject: string;
}

export enum CustomComponentsEnum {
  EMAIL_EDITOR = 'EMAIL_EDITOR',
  TEXT_AREA = 'TEXT_FIELD',
}

export const EmailStepControlSchema: JSONSchemaDto = {
  type: 'object',
  properties: {
    emailEditor: {
      type: 'string',
      extensions: {
        'x-novu-component-type': CustomComponentsEnum.EMAIL_EDITOR,
      },
    },
    subject: {
      type: 'string',
    },
  },
  required: ['emailEditor', 'subject'],
  additionalProperties: false,
};
