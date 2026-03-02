import { Controls } from '@novu/shared';
import { buildDefaultValues, buildDefaultValuesOfDataSchema } from '@/utils/schema';

// When uiSchema is non-empty, merges both schemas with dataSchema taking precedence over uiSchema for
// overlapping keys; controlValues take precedence over both. When uiSchema is empty, only dataSchema
// and controlValues are used.
export const getControlsDefaultValues = (resource: { controls: Controls }): Record<string, unknown> => {
  const controlValues = resource.controls.values;

  const uiSchemaDefaultValues = buildDefaultValues(resource.controls.uiSchema ?? {});
  const dataSchemaDefaultValues = buildDefaultValuesOfDataSchema(resource.controls.dataSchema ?? {});

  if (Object.keys(resource.controls.uiSchema ?? {}).length !== 0) {
    return {
      ...uiSchemaDefaultValues,
      ...dataSchemaDefaultValues,
      ...controlValues,
    };
  }

  return {
    ...dataSchemaDefaultValues,
    ...controlValues,
  };
};

// When uiSchema is non-empty, merges both schemas with uiSchema taking precedence over dataSchema for
// overlapping keys; controlValues take precedence over both. When uiSchema is empty, only dataSchema
// and controlValues are used.
export const getLayoutControlsDefaultValues = (resource: { controls: Controls }): Record<string, unknown> => {
  const controlValues = (resource.controls.values.email ?? {}) as Record<string, unknown>;

  const uiSchemaDefaultValues = buildDefaultValues(resource.controls.uiSchema ?? {});
  const dataSchemaDefaultValues = buildDefaultValuesOfDataSchema(resource.controls.dataSchema ?? {});

  if (Object.keys(resource.controls.uiSchema ?? {}).length !== 0) {
    return {
      ...dataSchemaDefaultValues,
      ...uiSchemaDefaultValues,
      ...controlValues,
    };
  }

  return {
    ...dataSchemaDefaultValues,
    ...controlValues,
  };
};
