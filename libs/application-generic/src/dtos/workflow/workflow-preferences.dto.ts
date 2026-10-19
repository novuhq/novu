import { ApiExtraModels, ApiProperty, getSchemaPath } from '@nestjs/swagger';
import { ChannelTypeEnum } from '@novu/shared';
import { Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';
import { ChannelPreferenceDto } from './channel-preference.dto';
import { WorkflowPreferenceDto } from './workflow-preference.dto';

@ApiExtraModels(WorkflowPreferenceDto, ChannelPreferenceDto)
export class WorkflowPreferencesDto {
  @ApiProperty({
    description:
      'A preference for the workflow. The values specified here will be used if no preference is specified for a channel.',
    oneOf: [{ $ref: getSchemaPath(WorkflowPreferenceDto) }],
  })
  @ValidateNested()
  @Type(() => WorkflowPreferenceDto)
  all: WorkflowPreferenceDto;

  @ApiProperty({
    description: 'Preferences for different communication channels',
    type: 'object',
    additionalProperties: {
      $ref: '#/components/schemas/ChannelPreferenceDto',
    },
    example: {
      [ChannelTypeEnum.EMAIL]: {
        enabled: true,
      },
      [ChannelTypeEnum.SMS]: {
        enabled: false,
      },
    },
  })
  @ValidateNested()
  @Type(() => ChannelPreferenceDto)
  channels: Record<ChannelTypeEnum, ChannelPreferenceDto>;
}
