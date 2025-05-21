import { ApiProperty } from '@nestjs/swagger';
import { ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ControlsMetadataDto } from '../controls-metadata.dto';
import { ChatControlDto } from '../controls/chat-control.dto';

export class ChatControlsMetadataResponseDto extends ControlsMetadataDto {
  @ApiProperty({
    description: 'Control values specific to Chat',
    type: () => ChatControlDto,
  })
  @ValidateNested()
  @Type(() => ChatControlDto)
  declare values: ChatControlDto;
}
