import { ResourceOriginEnum, Slug, StepTypeEnum } from '../../types';
import { RuntimeIssue } from '../../utils/issues';
import type { JSONSchemaDto } from './json-schema-dto';

export type StepResponseDto = {
  controls: Controls;
  controlValues?: Record<string, unknown>;
  variables: JSONSchemaDto;
  stepId: string;
  _id: string;
  name: string;
  slug: Slug;
  type: StepTypeEnum;
  origin: ResourceOriginEnum;
  workflowId: string;
  workflowDatabaseId: string;
  issues?: StepIssuesDto;
};

export type StepUpdateDto = StepCreateDto & {
  _id: string;
  stepId: string;
};

export type StepCreateDto = StepDto & {
  // TODO: Rename to controls to align naming with the response DTO
  controlValues?: Record<string, unknown> | null;
};

export type StepDto = {
  name: string;
  type: StepTypeEnum;
};

export class StepIssuesDto {
  controls?: Record<string, RuntimeIssue[]>;
  integration?: Record<string, RuntimeIssue[]>;
}

export type StepListResponseDto = {
  slug: Slug;
  type: StepTypeEnum;
  issues?: StepIssuesDto;
};

export type StepCreateAndUpdateKeys = keyof StepCreateDto | keyof StepUpdateDto;

export enum UiSchemaGroupEnum {
  IN_APP = 'IN_APP',
  EMAIL = 'EMAIL',
  DIGEST = 'DIGEST',
  DELAY = 'DELAY',
  THROTTLE = 'THROTTLE',
  SMS = 'SMS',
  CHAT = 'CHAT',
  PUSH = 'PUSH',
  SKIP = 'SKIP',
  LAYOUT = 'LAYOUT',
}

export enum UiComponentEnum {
  EMAIL_EDITOR_SELECT = 'EMAIL_EDITOR_SELECT',
  LAYOUT_SELECT = 'LAYOUT_SELECT',
  EMAIL_RENDERER_SELECT = 'EMAIL_RENDERER_SELECT',
  /** @deprecated use EMAIL_BODY instead  */
  BLOCK_EDITOR = 'BLOCK_EDITOR',
  EMAIL_BODY = 'EMAIL_BODY',
  TEXT_FULL_LINE = 'TEXT_FULL_LINE',
  TEXT_INLINE_LABEL = 'TEXT_INLINE_LABEL',
  IN_APP_BODY = 'IN_APP_BODY',
  IN_APP_AVATAR = 'IN_APP_AVATAR',
  IN_APP_SUBJECT = 'IN_APP_PRIMARY_SUBJECT',
  IN_APP_BUTTON_DROPDOWN = 'IN_APP_BUTTON_DROPDOWN',
  IN_APP_DISABLE_SANITIZATION_SWITCH = 'IN_APP_DISABLE_SANITIZATION_SWITCH',
  DISABLE_SANITIZATION_SWITCH = 'DISABLE_SANITIZATION_SWITCH',
  URL_TEXT_BOX = 'URL_TEXT_BOX',
  DIGEST_AMOUNT = 'DIGEST_AMOUNT',
  DIGEST_UNIT = 'DIGEST_UNIT',
  DIGEST_TYPE = 'DIGEST_TYPE',
  DIGEST_KEY = 'DIGEST_KEY',
  DIGEST_CRON = 'DIGEST_CRON',
  DELAY_AMOUNT = 'DELAY_AMOUNT',
  DELAY_UNIT = 'DELAY_UNIT',
  DELAY_TYPE = 'DELAY_TYPE',
  DELAY_CRON = 'DELAY_CRON',
  DELAY_DYNAMIC_KEY = 'DELAY_DYNAMIC_KEY',
  THROTTLE_TYPE = 'THROTTLE_TYPE',
  THROTTLE_WINDOW = 'THROTTLE_WINDOW',
  THROTTLE_UNIT = 'THROTTLE_UNIT',
  THROTTLE_DYNAMIC_KEY = 'THROTTLE_DYNAMIC_KEY',
  THROTTLE_THRESHOLD = 'THROTTLE_THRESHOLD',
  THROTTLE_KEY = 'THROTTLE_KEY',
  EXTEND_TO_SCHEDULE = 'EXTEND_TO_SCHEDULE',
  SMS_BODY = 'SMS_BODY',
  CHAT_BODY = 'CHAT_BODY',
  PUSH_BODY = 'PUSH_BODY',
  PUSH_SUBJECT = 'PUSH_SUBJECT',
  QUERY_EDITOR = 'QUERY_EDITOR',
  DATA = 'DATA',
  LAYOUT_EMAIL = 'LAYOUT_EMAIL',
}

export class UiSchemaProperty {
  placeholder?: unknown;
  component: UiComponentEnum;
  properties?: Record<string, UiSchemaProperty>;
}

export class UiSchema {
  group?: UiSchemaGroupEnum;
  properties?: Record<string, UiSchemaProperty>;
}

export class Controls {
  dataSchema?: JSONSchemaDto;
  uiSchema?: UiSchema;
  values: Record<string, unknown>;
}
