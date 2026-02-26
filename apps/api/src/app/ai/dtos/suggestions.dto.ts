import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WorkflowSuggestionType } from './generate-workflow.dto';

export class WorkflowSuggestionDto {
  @ApiProperty({ description: 'Suggestion identifier' })
  id: string;

  @ApiProperty({ description: 'Suggestion type', enum: WorkflowSuggestionType })
  type: WorkflowSuggestionType;

  @ApiProperty({ description: 'Display title for the suggestion' })
  title: string;

  @ApiProperty({ description: 'Description of what this suggestion does' })
  description: string;

  @ApiPropertyOptional({ description: 'Icon identifier for UI display' })
  icon?: string;

  @ApiProperty({ description: 'Example prompt text' })
  examplePrompt: string;
}
