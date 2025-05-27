import { IsArray, IsOptional, IsString } from 'class-validator';
import { PaginatedListCommand } from '@novu/application-generic';

export class ListWorkflowsCommand extends PaginatedListCommand {
  @IsOptional()
  searchQuery?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  status?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  steps?: string[];
}
