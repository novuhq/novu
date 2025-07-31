import { ApiProperty } from '@nestjs/swagger';
import { ContentIssueEnum } from '@novu/shared';
import { IsEnum } from 'class-validator';
import { BaseIssueDto } from './base-issue.dto';

export class StepContentIssueDto extends BaseIssueDto<ContentIssueEnum> {
  @ApiProperty({
    description: 'Type of step content issue',
    enum: [...Object.values(ContentIssueEnum)],
    enumName: 'ContentIssueEnum',
  })
  @IsEnum(ContentIssueEnum)
  issueType: ContentIssueEnum;
}
