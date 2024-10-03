/* eslint-disable no-param-reassign */
import { faker } from '@faker-js/faker';
import { GeneratePreviewRequestDto, HydrationStrategyEnum, JSONSchemaDto, TipTapNode } from '@novu/shared';
import { CollectPlaceholdersUseCase } from '../usecases/placeholder-enrichment/collect-placeholders-usecase';
import { TransformPlaceholderMapUseCase } from '../usecases/placeholder-enrichment/transform-placeholder-usecase-command';

export function addKeysToPayloadBasedOnHydrationStrategy(
  dto: GeneratePreviewRequestDto,
  controlValueKey: string
): Record<string, unknown> {
  if (!dto.controlValues) {
    return {};
  }

  const controlValue = dto.controlValues[controlValueKey];
  if (typeof controlValue === 'object') {
    return buildPayloadForEmailEditor(controlValue, dto);
  }

  const textWitPlaceholders = String(controlValue);
  if (!textWitPlaceholders) {
    return {};
  }
  let aggregatedPayload: Record<string, unknown> = dto.payloadValues || {};
  aggregatedPayload = resolvePayload(aggregatedPayload, textWitPlaceholders, dto);

  if (dto.hydrationStrategies.includes(HydrationStrategyEnum.HYDRATE_SYSTEM_VARIABLES_WITH_DEFAULTS)) {
    aggregatedPayload = resolveSystem(aggregatedPayload, textWitPlaceholders, dto);
  }

  return aggregatedPayload;
}

function buildPayloadForEmailEditor(controlValue: unknown, dto: GeneratePreviewRequestDto): Record<string, unknown> {
  const collectPlaceholderMappings1 = new CollectPlaceholdersUseCase().execute({ node: controlValue as TipTapNode });
  const transformPlaceholderMap1 = new TransformPlaceholderMapUseCase().execute({ input: collectPlaceholderMappings1 });

  return transformPlaceholderMap1.payload;
}

function handleRegularPayload(
  key: string,
  payload: Record<string, unknown>,
  hydrationStrategies: HydrationStrategyEnum[]
) {
  const valueFromPayload = getValueFromPayload(key, payload || {});
  if (valueFromPayload) {
    payload[key] = valueFromPayload;
  } else if (
    hydrationStrategies.includes(HydrationStrategyEnum.HYDRATE_PAYLOAD_VARIABLES_WITH_RANDOM_VALUES_IF_MISSING)
  ) {
    payload[key] = randomWithFaker();
  }
}

function resolveAndAddToPayload(
  aggregatedPayload: Record<string, unknown>,
  text: string,
  addToPayload: (key, payload) => void,
  placeholderInnerFields: string[]
): Record<string, unknown> {
  const payload: Record<string, unknown> = { ...aggregatedPayload };
  for (const placeholderInnerField of placeholderInnerFields) {
    const regexPattern = `{{(novu.${placeholderInnerField}\\.(\\w+))}}`;
    const regex = new RegExp(regexPattern, 'g');
    for (const match of [...text.matchAll(regex)]) {
      const key = match[1];
      addToPayload(key, payload);
    }
  }

  return payload;
}

function getValueFromPayload(key: string, payload: Record<string, unknown>): unknown {
  const keys = key.split('.').slice(2);

  return keys.reduce((acc, key2) => (acc && acc[key2] !== undefined ? acc[key2] : undefined), payload);
}

function randomWithFaker(): string {
  return faker.lorem.word();
}

function generateFakeValue(schema: JSONSchemaDto): unknown {
  switch (schema.type) {
    case 'string':
      return faker.lorem.word();
    case 'number':
      return faker.datatype.number();
    case 'boolean':
      return faker.datatype.boolean();
    case 'array':
      return [];
    case 'object':
      return {};
    default:
      return faker.lorem.word();
  }
}

function getAllDefaultValuesForSchema(schema: JSONSchemaDto, prefix: string = ''): Record<string, any> {
  const result: Record<string, any> = {};

  if (schema.default !== undefined) {
    result[prefix] = schema.default;
  } else if (schema.properties) {
    for (const [key, value] of Object.entries(schema.properties)) {
      const newPrefix = prefix ? `${prefix}.${key}` : key;
      const nestedDefaults = isJSONSchemaDto(value) ? getAllDefaultValuesForSchema(value, newPrefix) : {};
      Object.assign(result, nestedDefaults);
    }
  }

  if (result[prefix] === undefined) {
    result[prefix] = generateFakeValue(schema);
  }

  return result;
}

function isJSONSchemaDto(schema: any): schema is JSONSchemaDto {
  return schema && typeof schema === 'object' && 'type' in schema;
}

function getDefaultFromSchema(
  key: string,
  payload: Record<string, unknown>,
  schemaDefaults: Record<string, string>
): void {
  const defaultValue = schemaDefaults[key];
  if (defaultValue !== undefined) {
    payload[key] = defaultValue;
  }
}

function resolvePayload(
  aggregatedPayload: Record<string, unknown>,
  textWitPlaceholders: string,
  dto: GeneratePreviewRequestDto
) {
  return resolveAndAddToPayload(
    aggregatedPayload,
    textWitPlaceholders,
    (key, payload) => handleRegularPayload(key, payload, dto.hydrationStrategies),
    ['payload']
  );
}

function resolveSystem(
  aggregatedPayload: Record<string, unknown>,
  textWitPlaceholders: string,
  dto: GeneratePreviewRequestDto
) {
  const schemaDefaults = isJSONSchemaDto(dto.variablesSchema) ? getAllDefaultValuesForSchema(dto.variablesSchema) : {};

  return resolveAndAddToPayload(
    aggregatedPayload,
    textWitPlaceholders,
    (key, payload) => getDefaultFromSchema(key, payload, schemaDefaults),
    ['subscriber', 'actor', 'steps']
  );
}

export function mergeJsonObjects(
  primary: Record<string, unknown>,
  secondary: Record<string, unknown>
): Record<string, unknown> {
  const merged: Record<string, unknown> = { ...primary };

  for (const key in secondary) {
    if (!(key in merged)) {
      merged[key] = secondary[key];
    } else if (
      typeof merged[key] === 'object' &&
      merged[key] !== null &&
      typeof secondary[key] === 'object' &&
      secondary[key] !== null
    ) {
      merged[key] = mergeJsonObjects(merged[key] as Record<string, unknown>, secondary[key] as Record<string, unknown>);
    }
  }

  return merged;
}
