import { CursorBasedPaginatedCommand } from '@novu/application-generic';
import { Context, ContextTypeEnum } from '@novu/shared';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class GetContextsCommand extends CursorBasedPaginatedCommand<Context, 'createdAt' | 'updatedAt'> {
  @IsEnum(ContextTypeEnum)
  @IsOptional()
  type?: ContextTypeEnum;

  @IsString()
  @IsOptional()
  identifier?: string;
}
