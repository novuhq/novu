import { ContentIssueEnum } from '@novu/shared';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class ContentIssue {
  @IsOptional()
  @IsString()
  variableName?: string;

  @IsString()
  message: string;

  @IsEnum(ContentIssueEnum)
  issueType: ContentIssueEnum;
}
