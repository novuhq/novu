import { ApiProperty } from '@nestjs/swagger';
import { parseSlugId } from '@novu/application-generic';
import { Transform, Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsDefined, IsString, ValidateNested } from 'class-validator';
import { PatchPreferenceChannelsDto } from './patch-subscriber-preferences.dto';

export class BulkUpdateSubscriberPreferenceItemDto {
  @ApiProperty({ description: 'Channel-specific preference settings', type: PatchPreferenceChannelsDto })
  @Type(() => PatchPreferenceChannelsDto)
  channels: PatchPreferenceChannelsDto;

  @ApiProperty({
    description: 'Workflow internal _id, identifier or slug',
  })
  @IsDefined()
  @IsString()
  @Transform(({ value }) => parseSlugId(value))
  readonly workflowId: string;
}

export class BulkUpdateSubscriberPreferencesDto {
  @ApiProperty({
    description: 'Array of workflow preferences to update (maximum 100 items)',
    type: [BulkUpdateSubscriberPreferenceItemDto],
    maxItems: 100,
  })
  @IsDefined()
  @IsArray()
  @ArrayMaxSize(100)
  @Type(() => BulkUpdateSubscriberPreferenceItemDto)
  @ValidateNested({ each: true })
  readonly preferences: BulkUpdateSubscriberPreferenceItemDto[];
}
