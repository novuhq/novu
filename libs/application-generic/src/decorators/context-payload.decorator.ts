import { applyDecorators } from '@nestjs/common';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ApiPropertyOptions } from '@nestjs/swagger/dist/decorators/api-property.decorator';

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

export function ApiContextPayload(overrides?: Partial<ApiPropertyOptions>) {
  return applyDecorators(
    ApiPropertyOptional({
      ...CONTEXT_PAYLOAD_SWAGGER_OPTIONS,
      ...overrides,
    })
  );
}
