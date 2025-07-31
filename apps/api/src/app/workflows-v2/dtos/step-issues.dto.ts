import { ApiExtraModels, ApiPropertyOptional, getSchemaPath } from '@nestjs/swagger';
import { RuntimeIssue } from '@novu/shared';
import { IsOptional, ValidateNested } from 'class-validator';
import { StepIntegrationIssue } from './integration-issue.dto';
import { StepContentIssueDto } from './step-content-issue.dto';

@ApiExtraModels(StepContentIssueDto, StepIntegrationIssue)
export class StepIssuesDto {
  @ApiPropertyOptional({
    description: 'Controls-related issues',
    type: 'object',
    additionalProperties: {
      type: 'array',
      items: {
        $ref: getSchemaPath(StepContentIssueDto),
      },
    },
  })
  @IsOptional()
  @ValidateNested()
  controls?: Record<string, RuntimeIssue[]>;

  @ApiPropertyOptional({
    description: 'Integration-related issues',
    type: 'object',
    additionalProperties: {
      type: 'array',
      items: {
        $ref: getSchemaPath(StepIntegrationIssue),
      },
    },
  })
  @IsOptional()
  @ValidateNested()
  integration?: Record<string, RuntimeIssue[]>;
}
