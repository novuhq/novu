import { IsObject, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { StepCreateAndUpdateKeys } from '@novu/shared';
import { ContentIssue } from './content.issue';
import { StepIssue } from './step.issue';

export class StepIssues {
  @IsOptional()
  @IsObject()
  @ValidateNested({ each: true })
  @Type(() => StepIssue)
  body?: Record<StepCreateAndUpdateKeys, StepIssue>;

  @IsOptional()
  @IsObject()
  @ValidateNested({ each: true })
  @Type(() => ContentIssue)
  controls?: Record<string, ContentIssue[]>;
}
