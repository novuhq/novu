import { ActionStepEnum, actionStepSchemas, ChannelStepEnum, channelStepSchemas } from '@novu/framework';
import { EmailStepControlSchema } from '@novu/shared';

export const mapStepTypeToOutput = {
  [ChannelStepEnum.SMS]: channelStepSchemas[ChannelStepEnum.SMS].output,
  [ChannelStepEnum.EMAIL]: EmailStepControlSchema,
  [ChannelStepEnum.PUSH]: channelStepSchemas[ChannelStepEnum.PUSH].output,
  [ChannelStepEnum.CHAT]: channelStepSchemas[ChannelStepEnum.CHAT].output,
  [ChannelStepEnum.IN_APP]: channelStepSchemas[ChannelStepEnum.IN_APP].output,
  [ActionStepEnum.DELAY]: actionStepSchemas[ActionStepEnum.DELAY].output,
  [ActionStepEnum.DIGEST]: actionStepSchemas[ActionStepEnum.DIGEST].output,
};
