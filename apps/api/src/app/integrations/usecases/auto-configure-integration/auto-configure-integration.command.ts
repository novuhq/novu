import { IsDefined, IsString } from 'class-validator';
import { OrganizationCommand } from '../../../shared/commands/organization.command';

export class AutoConfigureIntegrationCommand extends OrganizationCommand {
  @IsDefined()
  @IsString()
  integrationId: string;
}
