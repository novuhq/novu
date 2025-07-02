import { IsOptional, IsString } from 'class-validator';
import { PaginatedListCommand } from '@novu/application-generic';

export class ListLayoutsCommand extends PaginatedListCommand {
  @IsString()
  @IsOptional()
  searchQuery?: string;
}
