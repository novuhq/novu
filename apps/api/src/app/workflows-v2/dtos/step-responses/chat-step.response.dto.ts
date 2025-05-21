import { ApiProperty } from '@nestjs/swagger';
import { ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { StepResponseDto } from '../step.response.dto';
import { ChatControlsMetadataResponseDto } from './chat-controls-metadata.response.dto';

export class ChatStepResponseDto extends StepResponseDto {
  @ApiProperty({
    description: 'Controls metadata for the chat step',
    type: () => ChatControlsMetadataResponseDto,
  })
  @ValidateNested()
  @Type(() => ChatControlsMetadataResponseDto)
  declare controls: ChatControlsMetadataResponseDto;
}
