import { IsArray, IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginatedListCommand } from '@novu/application-generic';
import { StepTypeEnum, WorkflowStatusEnum } from '@novu/shared';

export class ListWorkflowsCommand extends PaginatedListCommand {
  @IsOptional()
  searchQuery?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsArray()
  @IsEnum(WorkflowStatusEnum, { each: true })
  status?: WorkflowStatusEnum[];
}
