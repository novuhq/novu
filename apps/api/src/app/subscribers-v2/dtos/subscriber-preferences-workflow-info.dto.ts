import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SubscriberPreferencesWorkflowInfoDto {
  @ApiProperty({ description: 'Workflow slug' })
  slug: string;

  @ApiProperty({ description: 'Unique identifier of the workflow' })
  identifier: string;

  @ApiProperty({ description: 'Display name of the workflow' })
  name: string;

  @ApiPropertyOptional({
    description: 'last updated date',
  })
  updatedAt?: string;
}
