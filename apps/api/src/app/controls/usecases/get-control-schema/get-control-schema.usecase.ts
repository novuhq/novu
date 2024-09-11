import { Injectable } from '@nestjs/common';
import { ActionStepEnum, actionStepSchemas, ChannelStepEnum, channelStepSchemas, StepType } from '@novu/framework';

import { GetControlSchemaCommand } from './get-control-schema.command';
import { StepOutputSchema } from '../../types';

@Injectable()
export class GetControlSchema {
  async execute(command: GetControlSchemaCommand): Promise<StepOutputSchema> {
    return getStepOutput(command.stepType);
  }
}

export const getStepOutput = (stepType: StepType): StepOutputSchema => {
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
