import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { StepIssueEnum } from '@novu/shared';
import { BaseIssueDto } from './base-issue.dto';

export class StepIssueDto extends BaseIssueDto<StepIssueEnum> {
  @ApiProperty({
    description: 'Type of step issue',
    enum: [...Object.values(StepIssueEnum)],
    enumName: 'StepIssueEnum',
  })
  @IsEnum(StepIssueEnum)
  issueType: StepIssueEnum;
}
