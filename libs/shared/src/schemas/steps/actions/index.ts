import { ActionTypeEnum } from '../../../types';
import { Schema } from '../../../types/framework';
import { delayChannelSchemas } from './delay.schema';
import { digestChannelSchemas } from './digest.schema';

type RegularActionStepSchema = Exclude<ActionTypeEnum, ActionTypeEnum.TRIGGER | ActionTypeEnum.CUSTOM>;

export const actionStepSchemas = {
  delay: delayChannelSchemas,
  digest: digestChannelSchemas,
} satisfies Record<RegularActionStepSchema, { output: Schema; result: Schema }>;
