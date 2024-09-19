import { ActionStepEnum } from '../../../constants';
import { Schema } from '../../../types/schema.types';
import { delayActionSchemas } from './delay.schema';
import { digestActionSchemas } from './digest.schema';

type RegularActionStepSchema = Exclude<ActionStepEnum, ActionStepEnum.CUSTOM>;

export const actionStepSchemas = {
  delay: delayActionSchemas,
  digest: digestActionSchemas,
} satisfies Record<RegularActionStepSchema, { output: Schema; result: Schema }>;
