import { ApiPropertyOptional } from '@nestjs/swagger';
import { ContextPayload } from '@novu/shared';
import { Type } from 'class-transformer';
import { IsObject, IsOptional, ValidateNested } from 'class-validator';
import { ApiContextPayload, IsValidContextPayload } from '../../decorators';
import { SubscriberResponseDtoOptional } from '../subscribers/subscriber-response.dto';

export class PreviewPayloadDto {
  @ApiPropertyOptional({
    description: 'Partial subscriber information',
    type: SubscriberResponseDtoOptional,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => SubscriberResponseDtoOptional)
  subscriber?: SubscriberResponseDtoOptional;

  @ApiPropertyOptional({
    description: 'Payload data',
    type: 'object',
    additionalProperties: true,
  })
  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'Steps data',
    type: 'object',
    additionalProperties: true,
  })
  @IsOptional()
  @IsObject()
  steps?: Record<string, unknown>;

  @ApiContextPayload()
  @IsOptional()
  @IsValidContextPayload()
  context?: ContextPayload;

  @ApiPropertyOptional({
    description: 'Environment variables data',
    type: 'object',
    additionalProperties: true,
  })
  @IsOptional()
  @IsObject()
  env?: Record<string, unknown>;
}
