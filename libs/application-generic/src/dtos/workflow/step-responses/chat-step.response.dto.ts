import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ChatProviderIdEnum } from '@novu/shared';
import { Type } from 'class-transformer';
import { IsObject, IsOptional, ValidateNested } from 'class-validator';
import { ControlsMetadataDto } from '../../controls-metadata.dto';
import { ChatControlDto } from '../chat-control.dto';
import { ProviderOverridesDto } from '../provider-overrides.dto';
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

  @ApiPropertyOptional({
    description:
      'Per-provider content overrides keyed by providerId. Stored separately from controlValues and merged over the default body at send time.',
    type: () => ProviderOverridesDto,
    nullable: true,
  })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => ProviderOverridesDto)
  declare providerOverrides?: Partial<Record<ChatProviderIdEnum, Record<string, unknown>>> | null;
}
