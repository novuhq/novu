import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class WorkflowPreferenceDto {
  @ApiProperty({
    description:
      'A flag specifying if notification delivery is enabled for the workflow. If true, notification delivery' +
      ' is enabled by default for all channels. This setting can be overridden by the channel preferences.',
    default: true,
  })
  @IsBoolean()
  enabled: boolean = true;

  @ApiProperty({
    description:
      'A flag specifying if the preference is read-only. If true, the preference cannot be changed by the Subscriber.',
    default: false,
  })
  @IsBoolean()
  readOnly: boolean = false;
}
