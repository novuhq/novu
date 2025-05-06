import {
  chatControlSchema,
  chatUiSchema,
  delayControlSchema,
  delayUiSchema,
  digestControlSchema,
  digestUiSchema,
  emailControlSchema,
  emailUiSchema,
  inAppControlSchema,
  inAppUiSchema,
  pushControlSchema,
  pushUiSchema,
  smsControlSchema,
  smsUiSchema,
} from '@novu/application-generic';
import { ActionStepEnum, ChannelStepEnum } from '@novu/framework/internal';
import { ControlSchemas, JSONSchemaDto } from '@novu/shared';

export const PERMISSIVE_EMPTY_SCHEMA = {
  type: 'object',
  properties: {},
  required: [],
  additionalProperties: true,
} as JSONSchemaDto;

export const stepTypeToControlSchema: Record<ChannelStepEnum | ActionStepEnum, ControlSchemas> = {
  [ChannelStepEnum.IN_APP]: {
    schema: inAppControlSchema,
    uiSchema: inAppUiSchema,
  },
  [ChannelStepEnum.EMAIL]: {
    schema: emailControlSchema,
    uiSchema: emailUiSchema,
  },
  [ChannelStepEnum.SMS]: {
    schema: smsControlSchema,
    uiSchema: smsUiSchema,
  },
  [ChannelStepEnum.PUSH]: {
    schema: pushControlSchema,
    uiSchema: pushUiSchema,
  },
  [ChannelStepEnum.CHAT]: {
    schema: chatControlSchema,
    uiSchema: chatUiSchema,
  },
  [ActionStepEnum.DELAY]: {
    schema: delayControlSchema,
    uiSchema: delayUiSchema,
  },
  [ActionStepEnum.DIGEST]: {
    schema: digestControlSchema,
    uiSchema: digestUiSchema,
  },
  [ActionStepEnum.CUSTOM]: {
    schema: PERMISSIVE_EMPTY_SCHEMA,
  },
};
