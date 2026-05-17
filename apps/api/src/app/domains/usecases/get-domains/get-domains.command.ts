import { CursorBasedPaginatedCommand } from '@novu/application-generic';
import { DomainEntity } from '@novu/dal';
import { IsOptional, IsString } from 'class-validator';

export class GetDomainsCommand extends CursorBasedPaginatedCommand<DomainEntity, 'updatedAt' | '_id'> {
  @IsString()
  @IsOptional()
  name?: string;
}
