import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ContentIssueEnum } from '@novu/shared';

export class ContentIssue {
  @IsOptional()
  @IsString()
  variableName?: string;

  @IsString()
  message: string;

  @IsEnum(ContentIssueEnum)
  issueType: ContentIssueEnum;
}
