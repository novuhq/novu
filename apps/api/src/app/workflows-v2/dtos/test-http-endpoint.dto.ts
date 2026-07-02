import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PreviewPayloadDto } from '@novu/application-generic';
import { Type } from 'class-transformer';
import { IsNumber, IsObject, IsOptional, IsString, ValidateIf, ValidateNested } from 'class-validator';

export class TestHttpEndpointRequestDto {
  @ApiPropertyOptional({
    description: 'HTTP request control values (url, method, headers, body)',
    type: 'object',
    additionalProperties: true,
  })
  @IsOptional()
  @IsObject()
  controlValues?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'Preview payload for variable resolution (subscriber, payload, steps, context)',
    type: () => PreviewPayloadDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => PreviewPayloadDto)
  previewPayload?: PreviewPayloadDto;
}

export class ResolvedRequestDto {
  @ApiProperty({ description: 'Resolved URL after template compilation' })
  @IsString()
  url: string;

  @ApiProperty({ description: 'HTTP method' })
  @IsString()
  method: string;

  @ApiPropertyOptional({
    description: 'Resolved headers after template compilation',
    type: 'object',
    additionalProperties: true,
  })
  @IsOptional()
  @IsObject()
  headers?: Record<string, string>;

  @ApiPropertyOptional({
    description: 'Resolved body after template compilation',
    oneOf: [
      { type: 'object', additionalProperties: true },
      { type: 'array', items: {} },
    ],
  })
  @IsOptional()
  @ValidateIf((_object, value) => !Array.isArray(value))
  @IsObject()
  body?: Record<string, unknown> | unknown[];
}

export class TestHttpEndpointResponseDto {
  @ApiProperty({ description: 'HTTP response status code' })
  @IsNumber()
  statusCode: number;

  @ApiProperty({
    description: 'Parsed response body',
    nullable: true,
  })
  body: unknown;

  @ApiProperty({
    description: 'Response headers',
    type: 'object',
    additionalProperties: true,
  })
  @IsObject()
  headers: Record<string, string>;

  @ApiProperty({ description: 'Request duration in milliseconds' })
  @IsNumber()
  durationMs: number;

  @ApiProperty({ description: 'The compiled request that was sent', type: () => ResolvedRequestDto })
  @ValidateNested()
  @Type(() => ResolvedRequestDto)
  resolvedRequest: ResolvedRequestDto;
}
