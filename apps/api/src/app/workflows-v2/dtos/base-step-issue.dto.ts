import { ApiProperty } from '@nestjs/swagger';
import { ContentIssueEnum, IntegrationIssueEnum } from '@novu/shared';
import { IsEnum } from 'class-validator';
import { BaseIssueDto } from './base-issue.dto';

export class StepIssueDto extends BaseIssueDto<ContentIssueEnum | IntegrationIssueEnum> {
  @ApiProperty({
    description: 'Type of step issue',
    enum: [...Object.values(ContentIssueEnum), ...Object.values(IntegrationIssueEnum)],
    enumName: 'ContentIssueEnum | IntegrationIssueEnum',
  })
  @IsEnum([...Object.values(ContentIssueEnum), ...Object.values(IntegrationIssueEnum)])
  issueType: ContentIssueEnum | IntegrationIssueEnum;
}
