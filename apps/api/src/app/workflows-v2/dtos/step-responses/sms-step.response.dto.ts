import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { StepResponseDto } from '../step.response.dto';
import { SmsControlsMetadataResponseDto } from './sms-controls-metadata.response.dto';
import { SmsControlDto } from '../controls/sms-control.dto';

export class SmsStepResponseDto extends StepResponseDto<SmsControlDto> {
  @ApiProperty({
    description: 'Controls metadata for the SMS step',
    type: () => SmsControlsMetadataResponseDto,
  })
  @ValidateNested()
  @Type(() => SmsControlsMetadataResponseDto)
  declare controls: SmsControlsMetadataResponseDto;

  @ApiPropertyOptional({
    description: 'Control values for the SMS step',
    type: () => SmsControlDto,
  })
  @ValidateNested()
  @Type(() => SmsControlDto)
  declare controlValues?: SmsControlDto;
}
