import { ControlSchemas, JSONSchemaEntity } from '@novu/dal';
import { ActionStepEnum, ChannelStepEnum } from '@novu/framework/internal';
import { httpRequestControlSchema, httpRequestUiSchema } from '@novu/shared';
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
  throttleControlSchema,
  throttleUiSchema,
} from '../schemas/control';

export const PERMISSIVE_EMPTY_SCHEMA = {
  type: 'object',
  properties: {},
  required: [],
  additionalProperties: true,
} as JSONSchemaEntity;

const stepTypeToControlSchemaMap: Record<ChannelStepEnum | ActionStepEnum, ControlSchemas> = {
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
  [ActionStepEnum.THROTTLE]: {
    schema: throttleControlSchema,
    uiSchema: throttleUiSchema,
  },
  [ActionStepEnum.CUSTOM]: {
    schema: PERMISSIVE_EMPTY_SCHEMA,
  },
  [ActionStepEnum.HTTP_REQUEST]: {
    schema: httpRequestControlSchema as unknown as JSONSchemaEntity,
    uiSchema: httpRequestUiSchema,
  },
};

export const stepTypeToControlSchema = stepTypeToControlSchemaMap as Record<
  ChannelStepEnum | ActionStepEnum,
  ControlSchemas
>;
