import { ApiProperty } from '@nestjs/swagger';
import { ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { StepResponseDto } from '../step.response.dto';
import { EmailControlsMetadataResponseDto } from './email-controls-metadata.response.dto';

export class EmailStepResponseDto extends StepResponseDto {
  @ApiProperty({
    description: 'Controls metadata for the email step',
    type: () => EmailControlsMetadataResponseDto,
  })
  @ValidateNested()
  @Type(() => EmailControlsMetadataResponseDto)
  declare controls: EmailControlsMetadataResponseDto;
}
