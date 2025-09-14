import { CursorBasedPaginatedCommand } from '@novu/application-generic';
import { ContextTypeEnum, IContext } from '@novu/shared';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class GetContextsCommand extends CursorBasedPaginatedCommand<IContext, 'createdAt' | 'updatedAt'> {
  @IsEnum(ContextTypeEnum)
  @IsOptional()
  type?: ContextTypeEnum;

  @IsString()
  @IsOptional()
  identifier?: string;
}
