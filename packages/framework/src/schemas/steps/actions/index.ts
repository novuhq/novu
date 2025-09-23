import { ActionStepEnum } from '../../../constants';
import type { JsonSchema } from '../../../types/schema.types';
import { delayActionSchemas } from './delay.schema';
import { digestActionSchemas } from './digest.schema';
import { throttleActionSchemas } from './throttle.schema';

type RegularActionStepSchema = Exclude<ActionStepEnum, ActionStepEnum.CUSTOM>;

export const actionStepSchemas = {
  delay: delayActionSchemas,
  digest: digestActionSchemas,
  throttle: throttleActionSchemas,
} satisfies Record<RegularActionStepSchema, { output: JsonSchema; result: JsonSchema }>;
