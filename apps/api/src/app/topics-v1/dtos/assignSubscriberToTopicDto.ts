import { ExternalSubscriberId } from '@novu/shared';
import { ApiProperty } from '@nestjs/swagger';

export class FailedAssignmentsDto {
  @ApiProperty({
    description: 'List of subscriber IDs that were not found',
    type: [String],
    required: false,
  })
  notFound?: ExternalSubscriberId[];
}

export class AssignSubscriberToTopicDto {
  @ApiProperty({
    description: 'List of successfully assigned subscriber IDs',
    type: [String],
  })
  succeeded: ExternalSubscriberId[];

  @ApiProperty({
    description: 'Details about failed assignments',
    required: false,
    type: () => FailedAssignmentsDto,
  })
  failed?: FailedAssignmentsDto;
}
