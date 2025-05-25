import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { StepResponseDto } from '../step.response.dto';
import { ControlsMetadataDto } from '../controls-metadata.dto';
import { EmailControlDto } from '../controls/email-control.dto';

class EmailControlsMetadataResponseDto extends ControlsMetadataDto {
  @ApiProperty({
    description: 'Control values specific to Email',
    type: () => EmailControlDto,
  })
  @ValidateNested()
  @Type(() => EmailControlDto)
  declare values: EmailControlDto;
}

export class EmailStepResponseDto extends StepResponseDto<EmailControlDto> {
  @ApiProperty({
    description: 'Controls metadata for the email step',
    type: () => EmailControlsMetadataResponseDto,
  })
  @ValidateNested()
  @Type(() => EmailControlsMetadataResponseDto)
  declare controls: EmailControlsMetadataResponseDto;

  @ApiPropertyOptional({
    description: 'Control values for the email step',
    type: () => EmailControlDto,
  })
  @ValidateNested()
  @Type(() => EmailControlDto)
  declare controlValues?: EmailControlDto;
}
