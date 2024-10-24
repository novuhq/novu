import { ActionStepEnum, actionStepSchemas, ChannelStepEnum, channelStepSchemas } from '@novu/framework/internal';
import { ControlsSchema, EmailStepControlSchema } from '@novu/shared';

export const PERMISSIVE_EMPTY_SCHEMA = {
  type: 'object',
  properties: {},
  required: [],
  additionalProperties: true,
} as const;

export const mapStepTypeToControlScema: Record<ChannelStepEnum | ActionStepEnum, ControlsSchema> = {
  [ChannelStepEnum.SMS]: { schema: channelStepSchemas[ChannelStepEnum.SMS].output },
  [ChannelStepEnum.EMAIL]: { schema: EmailStepControlSchema },
  [ChannelStepEnum.PUSH]: { schema: channelStepSchemas[ChannelStepEnum.PUSH].output },
  [ChannelStepEnum.CHAT]: { schema: channelStepSchemas[ChannelStepEnum.CHAT].output },
  [ChannelStepEnum.IN_APP]: { schema: channelStepSchemas[ChannelStepEnum.IN_APP].output },
  [ActionStepEnum.DELAY]: { schema: actionStepSchemas[ActionStepEnum.DELAY].output },
  [ActionStepEnum.DIGEST]: { schema: actionStepSchemas[ActionStepEnum.DIGEST].output },
  [ActionStepEnum.CUSTOM]: { schema: PERMISSIVE_EMPTY_SCHEMA },
};
