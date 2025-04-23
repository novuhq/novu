import { IsEnum, IsOptional, IsString } from 'class-validator';
import { StepContentIssueEnum } from '@novu/shared';

export class ContentIssue {
  @IsOptional()
  @IsString()
  variableName?: string;

  @IsString()
  message: string;

  @IsEnum(StepContentIssueEnum)
  issueType: StepContentIssueEnum;
}
