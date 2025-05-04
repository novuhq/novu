import { buildDefaultValues, buildDefaultValuesOfDataSchema } from '@/utils/schema';
import { StepResponseDto } from '@novu/shared';

// Use the UI Schema to build the default values if it exists else use the data schema (code-first approach) values
export const getStepDefaultValues = (step: StepResponseDto): Record<string, unknown> => {
  const controlValues = step.controls.values;

  const uiSchemaDefaultValues = buildDefaultValues(step.controls.uiSchema ?? {});
  const dataSchemaDefaultValues = buildDefaultValuesOfDataSchema(step.controls.dataSchema ?? {});

  if (Object.keys(step.controls.uiSchema ?? {}).length !== 0) {
    return {
      ...uiSchemaDefaultValues,
      ...controlValues,
    };
  }

  return {
    ...dataSchemaDefaultValues,
    ...controlValues,
  };
};
