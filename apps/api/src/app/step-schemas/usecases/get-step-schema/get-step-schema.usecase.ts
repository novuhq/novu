import { Injectable } from '@nestjs/common';
import {
  ActionStepEnum,
  actionStepSchemas,
  ChannelStepEnum,
  channelStepSchemas,
  Schema,
  StepType,
} from '@novu/framework';

import { GetStepSchemaCommand } from './get-step-schema.command';
import { SchemaOutput } from '../../types';

@Injectable()
export class GetStepSchema {
  async execute(command: GetStepSchemaCommand): Promise<SchemaOutput> {
    return StepTypeToOutputMap[command.stepType];
  }
}

export const getStepDefaultOutput = (stepType: StepType): SchemaOutput => {
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
  [ActionStepEnum.CUSTOM]: {
    type: 'object',
    properties: {},
    required: [],
    additionalProperties: false,
  } as const satisfies Schema,
};
