import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class FailedOperationDto {
  @ApiPropertyOptional({
    description: 'The error message associated with the failed operation.',
  })
  message: string;

  @ApiPropertyOptional({
    description: 'The subscriber ID associated with the failed operation. This field is optional.',
    required: false,
  })
  subscriberId?: string;
}

export class UpdatedSubscriberDto {
  @ApiProperty({
    description: 'The ID of the subscriber that was updated.',
  })
  subscriberId: string;
}

export class CreatedSubscriberDto {
  @ApiProperty({
    description: 'The ID of the subscriber that was created.',
  })
  subscriberId: string;
}

export class BulkCreateSubscriberResponseDto {
  @ApiProperty({
    description: 'An array of subscribers that were successfully updated.',
    type: [UpdatedSubscriberDto],
  })
  updated: UpdatedSubscriberDto[];

  @ApiProperty({
    description: 'An array of subscribers that were successfully created.',
    type: [CreatedSubscriberDto],
  })
  created: CreatedSubscriberDto[];

  @ApiProperty({
    description: 'An array of failed operations with error messages and optional subscriber IDs.',
    type: [FailedOperationDto],
  })
  failed: FailedOperationDto[];
}
