import { Injectable } from '@nestjs/common';
import { ActionStepEnum, actionStepSchemas, ChannelStepEnum, channelStepSchemas, StepType } from '@novu/framework';

import { GetStepDefaultSchemaCommand } from './get-default-schema.command';
import { StepOutputSchema } from '../../types';

@Injectable()
export class GetStepDefaultSchema {
  async execute(command: GetStepDefaultSchemaCommand): Promise<StepOutputSchema> {
    return getStepDefaultOutput(command.stepType);
  }
}

export const getStepDefaultOutput = (stepType: StepType): StepOutputSchema => {
  return StepTypeToOutputMap[stepType];
};

export const StepTypeToOutputMap = {
  [ChannelStepEnum.SMS]: channelStepSchemas[ChannelStepEnum.SMS].output,
  [ChannelStepEnum.EMAIL]: channelStepSchemas[ChannelStepEnum.EMAIL].output,
  [ChannelStepEnum.PUSH]: channelStepSchemas[ChannelStepEnum.PUSH].output,
  [ChannelStepEnum.CHAT]: channelStepSchemas[ChannelStepEnum.CHAT].output,
  [ChannelStepEnum.IN_APP]: channelStepSchemas[ChannelStepEnum.IN_APP].output,
  [ActionStepEnum.DELAY]: actionStepSchemas[ActionStepEnum.DELAY].output,
  [ActionStepEnum.DIGEST]: actionStepSchemas[ActionStepEnum.DIGEST].output,
  [ActionStepEnum.CUSTOM]: {},
};
