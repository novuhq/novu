import { ApiProperty } from '@nestjs/swagger';
import { BaseIssueDto } from '@novu/application-generic';
import { ContentIssueEnum, IntegrationIssueEnum } from '@novu/shared';
import { IsEnum } from 'class-validator';

export class StepIssueDto extends BaseIssueDto<ContentIssueEnum | IntegrationIssueEnum> {
  @ApiProperty({
    description: 'Type of step issue',
    enum: [...Object.values(ContentIssueEnum), ...Object.values(IntegrationIssueEnum)],
    enumName: 'ContentIssueEnum | IntegrationIssueEnum',
  })
  @IsEnum([...Object.values(ContentIssueEnum), ...Object.values(IntegrationIssueEnum)])
  issueType: ContentIssueEnum | IntegrationIssueEnum;
}
