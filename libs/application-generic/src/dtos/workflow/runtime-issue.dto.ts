import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WorkflowIssueTypeEnum } from '@novu/shared';

export class RuntimeIssueDto {
  @ApiProperty({ enum: WorkflowIssueTypeEnum, enumName: 'WorkflowIssueTypeEnum' })
  issueType: WorkflowIssueTypeEnum;

  @ApiPropertyOptional({ description: 'Variable associated with the issue' })
  variableName?: string;

  @ApiProperty({ description: 'Human-readable issue message' })
  message: string;
}
