import type { JSONSchemaDto } from '../../../dto/workflows/json-schema-dto';
import { UiComponentEnum, UiSchema, UiSchemaGroupEnum } from '../../../dto/workflows/step.dto';

/**
 * Regex pattern for validating HTTP request URLs with template variables. Matches two cases:
 *
 * 1. URLs that start with template variables like {{variable}}
 *    - Example: {{subscriber.data.webhookUrl}}, {{payload.baseUrl}}/endpoint
 *
 * 2. Full absolute URLs (http/https) that may contain template variables anywhere
 *    - Example: https://api.example.com, https://api.example.com/users/{{payload.userId}}
 *
 */
export const HTTP_REQUEST_URL_REGEX = /^(?:\{\{[^}]*\}\}.*|https?:\/\/[^\s/$.?#][^\s{}]*(?:\{\{[^}]*\}\}[^\s{}]*)*)$/;

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
    key: { type: 'string', minLength: 1 },
    value: { type: 'string', minLength: 1 },
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
    },
    url: {
      type: 'string',
      pattern: HTTP_REQUEST_URL_REGEX.source,
      minLength: 1,
      maxLength: 2048,
    },
    headers: {
      type: 'array',
      items: keyValuePairSchema,
      maxItems: 50,
    },
    body: {
      oneOf: [
        {
          type: 'string',
          maxLength: 65536,
        },
        {
          type: 'array',
          items: keyValuePairSchema,
          maxItems: 100,
        },
      ],
    },
    responseBodySchema: {
      type: 'object',
      properties: {
        type: { type: 'string' },
        properties: { type: 'object', additionalProperties: true },
        required: { type: 'array', items: { type: 'string' } },
      },
      additionalProperties: true,
    },
    enforceSchemaValidation: {
      type: 'boolean',
    },
    continueOnFailure: {
      type: 'boolean',
    },
    timeout: {
      type: 'number',
      minimum: 100,
      maximum: 30000,
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
    continueOnFailure: {
      component: UiComponentEnum.DESTINATION_CONTINUE_ON_FAILURE,
      placeholder: false,
    },
    timeout: {
      component: UiComponentEnum.DESTINATION_TIMEOUT,
      placeholder: 5000,
    },
  },
};
