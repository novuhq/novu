import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsEnum, IsObject, IsOptional, IsString } from 'class-validator';

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
    description: 'Request body as key-value pairs',
    type: [HttpRequestKeyValuePairDto],
  })
  @IsArray()
  @IsOptional()
  body?: HttpRequestKeyValuePairDto[];

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
