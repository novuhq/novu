import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
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
