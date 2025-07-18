import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ContentIssueEnum, IntegrationIssueEnum } from '@novu/shared';

export class StepIssue {
  @IsEnum([...Object.values(ContentIssueEnum), ...Object.values(IntegrationIssueEnum)])
  issueType: ContentIssueEnum | IntegrationIssueEnum;

  @IsOptional()
  @IsString()
  variableName?: string;

  @IsString()
  message: string;
}
