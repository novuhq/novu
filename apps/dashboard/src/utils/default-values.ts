import { Controls } from '@novu/shared';
import { buildDefaultValues, buildDefaultValuesOfDataSchema } from '@/utils/schema';

// Use the UI Schema to build the default values if it exists else use the data schema (code-first approach) values
export const getControlsDefaultValues = (resource: { controls: Controls }): Record<string, unknown> => {
  const controlValues = resource.controls.values;

  const uiSchemaDefaultValues = buildDefaultValues(resource.controls.uiSchema ?? {});
  const dataSchemaDefaultValues = buildDefaultValuesOfDataSchema(resource.controls.dataSchema ?? {});

  if (Object.keys(resource.controls.uiSchema ?? {}).length !== 0) {
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

// Use the UI Schema to build the default values if it exists else use the data schema (code-first approach) values
export const getLayoutControlsDefaultValues = (resource: { controls: Controls }): Record<string, unknown> => {
  const controlValues = (resource.controls.values.email ?? {}) as Record<string, unknown>;

  const uiSchemaDefaultValues = buildDefaultValues(resource.controls.uiSchema ?? {});
  const dataSchemaDefaultValues = buildDefaultValuesOfDataSchema(resource.controls.dataSchema ?? {});

  if (Object.keys(resource.controls.uiSchema ?? {}).length !== 0) {
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
