import { EnvironmentWithUserObjectCommand } from '@novu/application-generic';
import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { WorkflowSuggestionType } from '../../dtos';

export class GenerateWorkflowCommand extends EnvironmentWithUserObjectCommand {
  @IsNotEmpty()
  @IsString()
  @MaxLength(2000)
  prompt: string;
}
