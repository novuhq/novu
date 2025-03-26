import { IsEnum, IsOptional, IsString } from 'class-validator';
import { StepIssueEnum } from '@novu/shared';

export class StepIssue {
  @IsEnum(StepIssueEnum)
  issueType: StepIssueEnum; // Union of both

  @IsOptional()
  @IsString()
  variableName?: string;

  @IsString()
  message: string;
}
