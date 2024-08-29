import { ActionStepEnum } from '../../../constants';
import { Schema } from '../../../types/schema.types';
import { delayActionSchemas } from './delay.schema';
import { digestActionSchemas } from './digest.schema';

// eslint-disable-next-line no-unused-vars
type RegularActionStepSchema = Exclude<ActionStepEnum, ActionStepEnum.CUSTOM>;

export const actionStepSchemas = {
  delay: delayActionSchemas,
  digest: digestActionSchemas,
} satisfies Record<RegularActionStepSchema, { output: Schema; result: Schema }>;
