import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';
import { ControlsMetadataDto } from '../../controls-metadata.dto';
import { ChatControlDto } from '../chat-control.dto';
import { StepResponseDto } from '../step.response.dto';

class ChatControlsMetadataResponseDto extends ControlsMetadataDto {
  @ApiProperty({
    description: 'Control values specific to Chat',
    type: () => ChatControlDto,
  })
  @ValidateNested()
  @Type(() => ChatControlDto)
  declare values: ChatControlDto;
}

export class ChatStepResponseDto extends StepResponseDto<ChatControlDto> {
  @ApiProperty({
    description: 'Controls metadata for the chat step',
    type: () => ChatControlsMetadataResponseDto,
  })
  @ValidateNested()
  @Type(() => ChatControlsMetadataResponseDto)
  declare controls: ChatControlsMetadataResponseDto;

  @ApiPropertyOptional({
    description: 'Control values for the chat step',
    type: () => ChatControlDto,
  })
  @ValidateNested()
  @Type(() => ChatControlDto)
  declare controlValues?: ChatControlDto;
}
