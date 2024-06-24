import { ActionStepEnum } from '../../../constants';
import { Schema } from '../../../types/schema.types';
import { delayChannelSchemas } from './delay.schema';
import { digestChannelSchemas } from './digest.schema';

type RegularActionStepSchema = Exclude<ActionStepEnum, ActionStepEnum.CUSTOM>;

export const actionStepSchemas = {
  delay: delayChannelSchemas,
  digest: digestChannelSchemas,
} satisfies Record<RegularActionStepSchema, { output: Schema; result: Schema }>;
