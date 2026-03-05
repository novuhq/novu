import type { JSONSchemaDto } from '../../../dto/workflows/json-schema-dto';
import { UiComponentEnum, UiSchema, UiSchemaGroupEnum } from '../../../dto/workflows/step.dto';

export enum HttpMethodEnum {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  DELETE = 'DELETE',
  PATCH = 'PATCH',
  HEAD = 'HEAD',
  OPTIONS = 'OPTIONS',
}

export type HttpRequestKeyValuePair = {
  key: string;
  value: string;
};

const keyValuePairSchema = {
  type: 'object',
  properties: {
    key: { type: 'string' },
    value: { type: 'string' },
  },
  required: ['key', 'value'],
  additionalProperties: false,
} as const satisfies JSONSchemaDto;

export const httpRequestControlSchema = {
  type: 'object',
  properties: {
    skip: {
      type: 'object',
      additionalProperties: true,
    },
    method: {
      type: 'string',
      enum: [
        HttpMethodEnum.GET,
        HttpMethodEnum.POST,
        HttpMethodEnum.PUT,
        HttpMethodEnum.DELETE,
        HttpMethodEnum.PATCH,
        HttpMethodEnum.HEAD,
        HttpMethodEnum.OPTIONS,
      ],
      default: HttpMethodEnum.POST,
    },
    url: {
      type: 'string',
      minLength: 1,
    },
    headers: {
      type: 'array',
      items: keyValuePairSchema,
      default: [],
    },
    body: {
      type: 'array',
      items: keyValuePairSchema,
      default: [],
    },
    responseBodySchema: {
      type: 'object',
      properties: {
        type: { type: 'string' },
        properties: { type: 'object', additionalProperties: true },
        required: { type: 'array', items: { type: 'string' } },
      },
      default: { type: 'object', properties: {} },
      additionalProperties: true,
    },
    enforceSchemaValidation: {
      type: 'boolean',
      default: false,
    },
  },
  required: ['method', 'url'],
  additionalProperties: false,
} as const satisfies JSONSchemaDto;

export const httpRequestUiSchema: UiSchema = {
  group: UiSchemaGroupEnum.HTTP_REQUEST,
  properties: {
    skip: {
      component: UiComponentEnum.QUERY_EDITOR,
    },
    method: {
      component: UiComponentEnum.DESTINATION_METHOD,
      placeholder: HttpMethodEnum.POST,
    },
    url: {
      component: UiComponentEnum.DESTINATION_URL,
      placeholder: 'https://api.example.com/endpoint',
    },
    headers: {
      component: UiComponentEnum.DESTINATION_HEADERS,
      placeholder: null,
    },
    body: {
      component: UiComponentEnum.DESTINATION_BODY,
      placeholder: null,
    },
    responseBodySchema: {
      component: UiComponentEnum.DESTINATION_RESPONSE_BODY_SCHEMA,
      placeholder: null,
    },
    enforceSchemaValidation: {
      component: UiComponentEnum.DESTINATION_ENFORCE_SCHEMA_VALIDATION,
      placeholder: false,
    },
  },
};
