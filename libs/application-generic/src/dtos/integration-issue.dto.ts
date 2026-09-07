import { ApiProperty } from '@nestjs/swagger';
import { IntegrationIssueEnum } from '@novu/shared';
import { IsEnum } from 'class-validator';
import { BaseIssueDto } from './base-issue.dto';

export class StepIntegrationIssue extends BaseIssueDto<IntegrationIssueEnum> {
  @ApiProperty({
    description: 'Type of integration issue',
    enum: [...Object.values(IntegrationIssueEnum)],
    enumName: 'IntegrationIssueEnum',
  })
  @IsEnum(IntegrationIssueEnum)
  issueType: IntegrationIssueEnum;
}
