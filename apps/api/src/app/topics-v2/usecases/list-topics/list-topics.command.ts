import { CursorBasedPaginatedCommand } from '@novu/application-generic';
import { TopicEntity } from '@novu/dal';
import { IsOptional, IsString } from 'class-validator';

export class ListTopicsCommand extends CursorBasedPaginatedCommand<TopicEntity, 'createdAt' | 'updatedAt' | '_id'> {
  @IsString()
  @IsOptional()
  key?: string;

  @IsString()
  @IsOptional()
  name?: string;
}
