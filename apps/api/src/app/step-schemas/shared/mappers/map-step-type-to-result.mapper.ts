import { ActionStepEnum, actionStepSchemas, ChannelStepEnum, channelStepSchemas } from '@novu/framework/internal';

export const mapStepTypeToResult = {
  [ChannelStepEnum.SMS]: channelStepSchemas[ChannelStepEnum.SMS].result,
  [ChannelStepEnum.EMAIL]: channelStepSchemas[ChannelStepEnum.EMAIL].result,
  [ChannelStepEnum.PUSH]: channelStepSchemas[ChannelStepEnum.PUSH].result,
  [ChannelStepEnum.CHAT]: channelStepSchemas[ChannelStepEnum.CHAT].result,
  [ChannelStepEnum.IN_APP]: channelStepSchemas[ChannelStepEnum.IN_APP].result,
  [ActionStepEnum.DELAY]: actionStepSchemas[ActionStepEnum.DELAY].result,
  [ActionStepEnum.DIGEST]: actionStepSchemas[ActionStepEnum.DIGEST].result,
};
