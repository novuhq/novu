import { CursorBasedPaginatedCommand } from '@novu/application-generic';
import { DomainRouteEntity } from '@novu/dal';
import { IsOptional, IsString } from 'class-validator';

export class ListDomainRoutesCommand extends CursorBasedPaginatedCommand<DomainRouteEntity, 'updatedAt' | '_id'> {
  @IsString()
  @IsOptional()
  domainId?: string;

  @IsString()
  @IsOptional()
  destination?: string;
}
