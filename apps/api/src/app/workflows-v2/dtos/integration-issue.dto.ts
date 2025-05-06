import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { StepIntegrationIssueEnum } from '@novu/shared';
import { BaseIssueDto } from './base-issue.dto';

export class StepIntegrationIssue extends BaseIssueDto<StepIntegrationIssueEnum> {
  @ApiProperty({
    description: 'Type of integration issue',
    enum: [...Object.values(StepIntegrationIssueEnum)],
    enumName: 'StepIntegrationIssueEnum',
  })
  @IsEnum(StepIntegrationIssueEnum)
  issueType: StepIntegrationIssueEnum;
}
