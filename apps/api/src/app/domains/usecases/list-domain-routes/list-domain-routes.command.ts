import { CursorBasedPaginatedCommand } from '@novu/application-generic';
import { DomainRouteEntity } from '@novu/dal';
import { IsOptional, IsString } from 'class-validator';

export class ListDomainRoutesCommand extends CursorBasedPaginatedCommand<DomainRouteEntity, 'updatedAt' | '_id'> {
  @IsString()
  @IsOptional()
  domain?: string;

  @IsString()
  @IsOptional()
  agentId?: string;
}
