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

export class PayloadValidationErrorDto {
  @ApiProperty({
    description: 'Field path that failed validation',
    example: 'user.name',
  })
  field: string;

  @ApiProperty({
    description: 'Validation error message',
    example: "must have required property 'name'",
  })
  message: string;

  @ApiProperty({
    description: 'The actual value that failed validation',
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
    required: false,
    example: { age: 25 },
  })
  value?: any;

  @ApiProperty({
    description: 'JSON Schema path where the validation failed',
    example: '#/required',
    required: false,
  })
  schemaPath?: string;
}

@ApiExtraModels(PayloadValidationErrorDto)
export class PayloadValidationExceptionDto extends ErrorDto {
  @ApiProperty({
    description: 'Type identifier for payload validation errors',
    example: 'PAYLOAD_VALIDATION_ERROR',
  })
  type: string;

  @ApiProperty({
    description: 'Array of detailed validation errors',
    type: [PayloadValidationErrorDto],
    example: [
      {
        field: 'user.name',
        message: "must have required property 'name'",
        value: { age: 25 },
        schemaPath: '#/required',
      },
    ],
  })
  errors: PayloadValidationErrorDto[];

  @ApiProperty({
    description: 'The JSON schema that was used for validation',
    type: 'object',
    required: false,
    example: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        age: { type: 'number' },
      },
      required: ['name'],
    },
  })
  schema?: any;
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
