import { ApiProperty } from '@nestjs/swagger';

export class SubscriberPreferenceTemplateResponseDto {
  @ApiProperty({
    description: 'Unique identifier of the workflow',
    type: String,
  })
  _id: string;

  @ApiProperty({
    description: 'Name of the workflow',
    type: String,
  })
  name: string;

  @ApiProperty({
    description:
      'Critical templates will always be delivered to the end user and should be hidden from the subscriber preferences screen',
    type: Boolean,
  })
  critical: boolean;
}
