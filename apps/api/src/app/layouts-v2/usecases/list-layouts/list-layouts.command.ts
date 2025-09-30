import { PaginatedListCommand } from '@novu/application-generic';
import { IsOptional, IsString } from 'class-validator';

export class ListLayoutsCommand extends PaginatedListCommand {
  @IsString()
  @IsOptional()
  searchQuery?: string;
}
