import { IsString, IsOptional, IsDate } from 'class-validator';

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class GetWorkflowRunResponseBaseDto {
  @ApiProperty({ description: 'Workflow run id' })
  @IsString()
  id: string;

  @ApiProperty({ description: 'Workflow run identifier' })
  @IsString()
  workflowRunId: string;

  @ApiProperty({ description: 'Workflow identifier' })
  @IsString()
  workflowId: string;

  @ApiProperty({ description: 'Workflow name' })
  @IsString()
  workflowName: string;

  @ApiProperty({ description: 'Organization identifier' })
  @IsString()
  organizationId: string;

  @ApiProperty({ description: 'Environment identifier' })
  @IsString()
  environmentId: string;

  @ApiProperty({ description: 'Internal subscriber identifier' })
  @IsString()
  internalSubscriberId: string;

  @ApiPropertyOptional({ description: 'External subscriber identifier' })
  @IsOptional()
  @IsString()
  subscriberId?: string;

  @ApiProperty({ description: 'Workflow run status' })
  @IsString()
  status: string;

  @ApiProperty({ description: 'Trigger identifier' })
  @IsString()
  triggerIdentifier: string;

  @ApiProperty({ description: 'Transaction identifier' })
  @IsString()
  transactionId: string;

  @ApiProperty({ description: 'Creation timestamp' })
  @IsDate()
  createdAt: Date;

  @ApiProperty({ description: 'Update timestamp' })
  @IsDate()
  updatedAt: Date;
}
