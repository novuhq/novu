import { ApiProperty, ApiPropertyOptional, getSchemaPath } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  ValidateBy,
  type ValidationOptions,
} from 'class-validator';

export enum HttpMethodEnum {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  DELETE = 'DELETE',
  PATCH = 'PATCH',
}

export class HttpRequestKeyValuePairDto {
  @ApiProperty({ description: 'Key of the key-value pair' })
  @IsString()
  key: string;

  @ApiProperty({ description: 'Value of the key-value pair' })
  @IsString()
  value: string;
}

function IsHttpRequestBodyControl(validationOptions?: ValidationOptions) {
  return ValidateBy(
    {
      name: 'isHttpRequestBodyControl',
      validator: {
        validate: (value: unknown) => {
          if (value === undefined || value === null || typeof value === 'string') {
            return true;
          }

          return (
            Array.isArray(value) &&
            value.every(
              (item) =>
                item !== null &&
                typeof item === 'object' &&
                typeof (item as HttpRequestKeyValuePairDto).key === 'string' &&
                typeof (item as HttpRequestKeyValuePairDto).value === 'string'
            )
          );
        },
        defaultMessage: () => 'body must be a raw JSON string or an array of key-value pairs',
      },
    },
    validationOptions
  );
}

export class HttpRequestControlDto {
  @ApiProperty({
    description: 'HTTP method',
    enum: HttpMethodEnum,
    enumName: 'HttpMethodEnum',
  })
  @IsEnum(HttpMethodEnum)
  method: HttpMethodEnum;

  @ApiProperty({ description: 'Target URL for the HTTP request' })
  @IsString()
  url: string;

  @ApiPropertyOptional({
    description: 'Request headers as key-value pairs',
    type: [HttpRequestKeyValuePairDto],
  })
  @IsArray()
  @IsOptional()
  headers?: HttpRequestKeyValuePairDto[];

  @ApiPropertyOptional({
    description: 'Request body as a raw JSON string. Key-value arrays are supported for legacy workflows.',
    oneOf: [
      { type: 'string' },
      {
        type: 'array',
        items: { $ref: getSchemaPath(HttpRequestKeyValuePairDto) },
      },
    ],
  })
  @IsHttpRequestBodyControl()
  @IsOptional()
  body?: string | HttpRequestKeyValuePairDto[];

  @ApiPropertyOptional({
    description: 'JSON schema to validate response body against',
    type: 'object',
    additionalProperties: true,
  })
  @IsObject()
  @IsOptional()
  responseBodySchema?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Whether to enforce response body schema validation' })
  @IsBoolean()
  @IsOptional()
  enforceSchemaValidation?: boolean;

  @ApiPropertyOptional({ description: 'Whether to continue workflow execution on failure' })
  @IsBoolean()
  @IsOptional()
  continueOnFailure?: boolean;
}
