import { StepResponseDto } from '@novu/shared';
import { buildDefaultValues, buildDefaultValuesOfDataSchema } from '@/utils/schema';

// Use the UI Schema to build the default values if it exists else use the data schema (code-first approach) values
export const getStepDefaultValues = (step: StepResponseDto): Record<string, unknown> => {
  const controlValues = step.controls.values;
  const hasControlValues = Object.keys(controlValues).length > 0;

  if (Object.keys(step.controls.uiSchema ?? {}).length !== 0) {
    return hasControlValues ? controlValues : buildDefaultValues(step.controls.uiSchema ?? {});
  }

  return hasControlValues ? controlValues : buildDefaultValuesOfDataSchema(step.controls.dataSchema ?? {});
};
