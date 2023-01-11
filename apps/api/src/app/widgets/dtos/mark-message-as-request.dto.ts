import { IsBoolean, IsOptional, ValidateNested } from 'class-validator';
import { ApiExtraModels, ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ChannelPreference } from '../../shared/dtos/channel-preference';

class MarkMessageFields {
  @ApiProperty({
    type: Boolean,
    required: false,
  })
  seen?: boolean;

  @ApiProperty({
    type: Boolean,
    required: false,
  })
  read?: boolean;
}

export class MarkMessageAsRequestDto {
  @ApiProperty({
    type: String,
    isArray: true,
    required: true,
  })
  messageId: string | string[];

  @ApiProperty({
    type: MarkMessageFields,
  })
  mark: MarkMessageFields;
}
