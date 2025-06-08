import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class SyncWorkflowDto {
  @ApiProperty({
    description: 'Target environment identifier to sync the workflow to',
    type: 'string',
  })
  @IsString()
  targetEnvironmentId: string;
}
