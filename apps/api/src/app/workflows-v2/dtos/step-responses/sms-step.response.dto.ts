import { ApiProperty } from '@nestjs/swagger';
import { ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { StepResponseDto } from '../step.response.dto';
import { SmsControlsMetadataResponseDto } from './sms-controls-metadata.response.dto';

export class SmsStepResponseDto extends StepResponseDto {
  @ApiProperty({
    description: 'Controls metadata for the SMS step',
    type: () => SmsControlsMetadataResponseDto,
  })
  @ValidateNested()
  @Type(() => SmsControlsMetadataResponseDto)
  declare controls: SmsControlsMetadataResponseDto;
}
