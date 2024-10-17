import {
  GeneratePreviewRequestDto,
  HydrationStrategyEnum,
  JsonSchemaDto,
  TipTapNodeSchemaDto,
} from '@novu/shared-internal';
import { faker } from '@faker-js/faker';
import { RecordType } from 'zod';
import { collectPlaceholders, PlaceholderMap } from './email-editor-hydration-component';

/**
 * Resolves the payload based on the hydration strategy.
 * @param dto - The request DTO containing hydration strategies.
 * @param controlValueKey
 * @returns The updated payload.
 */
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

function buildPayload(
  collectPlaceholderMappings1: PlaceholderMap,
  payloadValues?: RecordType<string, unknown>
): Record<string, unknown> {
  return {};
}

/**
 * Builds a payload for the email editor.
 * @param controlValue - The control value.
 * @param dto - The request DTO.
 * @returns The payload.
 */

function buildPayloadForEmailEditor(controlValue: unknown, dto: GeneratePreviewRequestDto): Record<string, unknown> {
  console.log('buildPayloadForEmailEditor.controlValue', JSON.stringify(controlValue, null, 2));

  const collectPlaceholderMappings1 = collectPlaceholders(controlValue as TipTapNodeSchemaDto);
  console.log(
    'buildPayloadForEmailEditor.collectPlaceholderMappings1.output',
    JSON.stringify(collectPlaceholderMappings1, null, 2)
  );

  return buildPayload(collectPlaceholderMappings1, dto.payloadValues);
}

function handleRegularPayload(
  key: string,
  payload: Record<string, unknown>,
  hydrationStrategies: HydrationStrategyEnum[]
) {
  const valueFromPayload = getValueFromPayload(key, payload || {});
  if (valueFromPayload) {
    // eslint-disable-next-line no-param-reassign
    payload[key] = valueFromPayload;
  } else if (
    hydrationStrategies.includes(HydrationStrategyEnum.HYDRATE_PAYLOAD_VARIABLES_WITH_RANDOM_VALUES_IF_MISSING)
  ) {
    // eslint-disable-next-line no-param-reassign
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

function generateFakeValue(schema: JsonSchemaDto): unknown {
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

function getAllDefaultValuesForSchema(schema: JsonSchemaDto, prefix: string = ''): Record<string, any> {
  const result: Record<string, any> = {};

  if (schema.default !== undefined) {
    result[prefix] = schema.default;
  } else if (schema.properties) {
    for (const [key, value] of Object.entries(schema.properties)) {
      const newPrefix = prefix ? `${prefix}.${key}` : key;
      const nestedDefaults = getAllDefaultValuesForSchema(value, newPrefix);
      Object.assign(result, nestedDefaults);
    }
  }

  if (result[prefix] === undefined) {
    result[prefix] = generateFakeValue(schema);
  }

  return result;
}

function getDefaultFromSchema(
  key: string,
  payload: Record<string, unknown>,
  schemaDefaults: Record<string, string>
): void {
  const defaultValue = schemaDefaults[key];
  if (defaultValue !== undefined) {
    // eslint-disable-next-line no-param-reassign
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
  const schemaDefaults = getAllDefaultValuesForSchema(dto.variablesSchema);

  return resolveAndAddToPayload(
    aggregatedPayload,
    textWitPlaceholders,
    (key, payload) => getDefaultFromSchema(key, payload, schemaDefaults),
    ['subscriber', 'actor', 'steps']
  );
}
