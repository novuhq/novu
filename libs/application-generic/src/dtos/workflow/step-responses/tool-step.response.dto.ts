import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';
import { ControlsMetadataDto } from '../../controls-metadata.dto';
import { StepResponseDto } from '../step.response.dto';
import { ToolControlDto } from '../tool-control.dto';

class ToolControlsMetadataResponseDto extends ControlsMetadataDto {
  @ApiProperty({
    description: 'Control values specific to Tool',
    type: () => ToolControlDto,
  })
  @ValidateNested()
  @Type(() => ToolControlDto)
  declare values: ToolControlDto;
}

export class ToolStepResponseDto extends StepResponseDto<ToolControlDto> {
  @ApiProperty({
    description: 'Controls metadata for the tool step',
    type: () => ToolControlsMetadataResponseDto,
  })
  @ValidateNested()
  @Type(() => ToolControlsMetadataResponseDto)
  declare controls: ToolControlsMetadataResponseDto;

  @ApiPropertyOptional({
    description: 'Control values for the tool step',
    type: () => ToolControlDto,
  })
  @ValidateNested()
  @Type(() => ToolControlDto)
  declare controlValues?: ToolControlDto;
}
