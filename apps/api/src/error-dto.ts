import { ApiExtraModels, ApiProperty, getSchemaPath } from '@nestjs/swagger'; // Ensure you have the correct import for ApiProperty
import { ConstraintValidation } from '@novu/application-generic';

export class ErrorDto {
  @ApiProperty({
    description: 'HTTP status code of the error response.',
    example: 404,
  })
  statusCode: number;

  @ApiProperty({
    description: 'Timestamp of when the error occurred.',
    example: '2024-12-12T13:00:00Z',
  })
  timestamp: string;

  @ApiProperty({
    description: 'The path where the error occurred.',
    example: '/api/v1/resource',
  })
  path: string;

  @ApiProperty({
    required: false,
    description: 'Value that failed validation',
    oneOf: [
      { type: 'string', nullable: true },
      { type: 'number' },
      { type: 'boolean' },
      { type: 'object', nullable: true },
      {
        type: 'array',
        items: {
          anyOf: [
            { type: 'string', nullable: true },
            { type: 'number' },
            { type: 'boolean' },
            { type: 'object', additionalProperties: true },
          ],
        },
      },
    ],
    example: 'xx xx xx ',
  })
  message?: unknown;

  @ApiProperty({
    description: 'Optional context object for additional error details.',
    type: 'object',
    required: false,
    additionalProperties: true,
    example: {
      workflowId: 'some_wf_id',
      stepId: 'some_wf_id',
    },
  })
  ctx?: object | Object;

  /**
   * Optional unique identifier for the error, useful for tracking using Sentry and New Relic, only available for 500.
   */
  @ApiProperty({
    description: `Optional unique identifier for the error, useful for tracking using Sentry and 
      New Relic, only available for 500.`,
    example: 'abc123',
    required: false,
  })
  errorId?: string;
}
@ApiExtraModels(ConstraintValidation)
export class ValidationErrorDto extends ErrorDto {
  @ApiProperty({
    description: 'A record of validation errors keyed by field name',
    type: 'object',
    additionalProperties: {
      $ref: getSchemaPath(ConstraintValidation),
    },
    example: {
      fieldName1: {
        messages: ['Field is required', 'Must be a valid email address'],
        value: 'invalidEmail',
      },
      fieldName2: {
        messages: ['Must be at least 18 years old'],
        value: 17,
      },
      fieldName3: {
        messages: ['Must be a boolean value'],
        value: true,
      },
      fieldName4: {
        messages: ['Must be a valid object'],
        value: { key: 'value' },
      },
      fieldName5: {
        messages: ['Field is missing'],
        value: null,
      },
      fieldName6: {
        messages: ['Undefined value'],
      },
    },
  })
  errors: Record<string, ConstraintValidation>;
}
