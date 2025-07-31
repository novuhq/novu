import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsObject, IsOptional, ValidateNested } from 'class-validator';
import { SubscriberResponseDtoOptional } from '../../subscribers/dtos';

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
}
