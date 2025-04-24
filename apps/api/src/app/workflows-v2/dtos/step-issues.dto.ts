import { ApiExtraModels, ApiPropertyOptional, getSchemaPath } from '@nestjs/swagger';
import { IsOptional, ValidateNested } from 'class-validator';
import { StepContentIssueDto } from './step-content-issue.dto';
import { StepIntegrationIssue } from './integration-issue.dto';

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
  controls?: Record<string, StepContentIssueDto[]>;

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
  integration?: Record<string, StepIntegrationIssue[]>;
}
