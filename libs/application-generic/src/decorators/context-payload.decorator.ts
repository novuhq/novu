import { applyDecorators } from '@nestjs/common';
import { ApiPropertyOptional, ApiPropertyOptions } from '@nestjs/swagger';

const CONTEXT_PAYLOAD_SWAGGER_OPTIONS: ApiPropertyOptions = {
  type: 'object',
  additionalProperties: {
    oneOf: [
      {
        type: 'string',
        description: 'Simple context id',
        example: 'org-acme',
      },
      {
        type: 'object',
        description: 'Rich context object with id and optional data',
        properties: {
          id: { type: 'string', example: 'org-acme' },
          data: {
            type: 'object',
            description: 'Optional additional context data',
            additionalProperties: true,
            example: { name: 'Acme Corp', region: 'us-east-1' },
          },
        },
        required: ['id'],
      },
    ],
  },
};

export function ApiContextPayload() {
  return applyDecorators(ApiPropertyOptional(CONTEXT_PAYLOAD_SWAGGER_OPTIONS));
}
