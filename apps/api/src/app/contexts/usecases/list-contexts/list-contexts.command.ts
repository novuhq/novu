import { CursorBasedPaginatedCommand } from '@novu/application-generic';
import { Context, ContextType } from '@novu/shared';
import { IsOptional, IsString } from 'class-validator';

export class ListContextsCommand extends CursorBasedPaginatedCommand<Context, 'createdAt' | 'updatedAt'> {
  @IsString()
  @IsOptional()
  type?: ContextType;

  @IsString()
  @IsOptional()
  id?: string;

  @IsString()
  @IsOptional()
  search?: string;
}
