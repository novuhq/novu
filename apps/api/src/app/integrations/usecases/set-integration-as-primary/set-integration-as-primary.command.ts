import { IsDefined, IsMongoId } from 'class-validator';

import { OrganizationCommand } from '../../../shared/commands/organization.command';

export class SetIntegrationAsPrimaryCommand extends OrganizationCommand {
  @IsDefined()
  @IsMongoId()
  integrationId: string;

  @IsDefined()
  @IsMongoId()
  environmentId: string;
}
