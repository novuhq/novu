import { ActionStepEnum, actionStepSchemas, ChannelStepEnum, channelStepSchemas, Schema } from '@novu/framework';

export const schemasList = Object.values({ ...channelStepSchemas, ...actionStepSchemas }).map(
  (schema) => schema.output
);

export const customActionStepSchema = {
  type: 'object',
  properties: {},
  required: [],
  additionalProperties: false,
} as const satisfies Schema;

export const mapStepTypeToOutput = {
  [ChannelStepEnum.SMS]: channelStepSchemas[ChannelStepEnum.SMS].output,
  [ChannelStepEnum.EMAIL]: channelStepSchemas[ChannelStepEnum.EMAIL].output,
  [ChannelStepEnum.PUSH]: channelStepSchemas[ChannelStepEnum.PUSH].output,
  [ChannelStepEnum.CHAT]: channelStepSchemas[ChannelStepEnum.CHAT].output,
  [ChannelStepEnum.IN_APP]: channelStepSchemas[ChannelStepEnum.IN_APP].output,
  [ActionStepEnum.DELAY]: actionStepSchemas[ActionStepEnum.DELAY].output,
  [ActionStepEnum.DIGEST]: actionStepSchemas[ActionStepEnum.DIGEST].output,
};

export const mapStepTypeToResult = {
  [ChannelStepEnum.SMS]: channelStepSchemas[ChannelStepEnum.SMS].result,
  [ChannelStepEnum.EMAIL]: channelStepSchemas[ChannelStepEnum.EMAIL].result,
  [ChannelStepEnum.PUSH]: channelStepSchemas[ChannelStepEnum.PUSH].result,
  [ChannelStepEnum.CHAT]: channelStepSchemas[ChannelStepEnum.CHAT].result,
  [ChannelStepEnum.IN_APP]: channelStepSchemas[ChannelStepEnum.IN_APP].result,
  [ActionStepEnum.DELAY]: actionStepSchemas[ActionStepEnum.DELAY].result,
  [ActionStepEnum.DIGEST]: actionStepSchemas[ActionStepEnum.DIGEST].result,
};
