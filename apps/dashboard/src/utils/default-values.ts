import { Controls } from '@novu/shared';
import { buildDefaultValues, buildDefaultValuesOfDataSchema } from '@/utils/schema';

// Strips out null/undefined/empty-string entries so that unset saved values
// don't shadow schema-defined defaults during form initialisation.
const stripEmptyValues = (values: Record<string, unknown>): Record<string, unknown> => {
  return Object.fromEntries(Object.entries(values).filter(([, v]) => v !== null && v !== undefined && v !== ''));
};

// When uiSchema is non-empty, merges both schemas with dataSchema taking precedence over uiSchema for
// overlapping keys; controlValues take precedence over both. When uiSchema is empty, only dataSchema
// and controlValues are used.
export const getControlsDefaultValues = (resource: { controls: Controls }): Record<string, unknown> => {
  const controlValues = resource.controls.values;
  const strippedControlValues = stripEmptyValues(controlValues as Record<string, unknown>);

  const uiSchemaDefaultValues = buildDefaultValues(resource.controls.uiSchema ?? {});
  const dataSchemaDefaultValues = buildDefaultValuesOfDataSchema(resource.controls.dataSchema ?? {});

  if (Object.keys(resource.controls.uiSchema ?? {}).length !== 0) {
    return {
      ...uiSchemaDefaultValues,
      ...dataSchemaDefaultValues,
      ...strippedControlValues,
    };
  }

  return {
    ...dataSchemaDefaultValues,
    ...strippedControlValues,
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
