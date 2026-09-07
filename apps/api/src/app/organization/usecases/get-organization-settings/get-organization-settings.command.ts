import { BaseCommand } from '@novu/application-generic';
import { OrganizationEntity } from '@novu/dal';
import { IsNotEmpty, IsOptional } from 'class-validator';

export class GetOrganizationSettingsCommand extends BaseCommand {
  @IsNotEmpty()
  readonly organizationId: string;

  @IsOptional()
  readonly organization?: OrganizationEntity;
}
