import { IsOptional } from 'class-validator';
import { PaginatedListCommand } from '@novu/application-generic';

export class ListWorkflowsCommand extends PaginatedListCommand {
  @IsOptional()
  searchQuery?: string;
}
