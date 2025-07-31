import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, ValidateNested } from 'class-validator';
import { SubscriberResponseDtoOptional } from '../../subscribers/dtos';

export class LayoutPreviewPayloadDto {
  @ApiPropertyOptional({
    description: 'Partial subscriber information',
    type: SubscriberResponseDtoOptional,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => SubscriberResponseDtoOptional)
  subscriber?: SubscriberResponseDtoOptional;
}
