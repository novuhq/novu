import { IsNotEmpty, IsString } from 'class-validator';
import { OrganizationCommand } from '../../../shared/commands/organization.command';

export class GenerateMsTeamsArmTemplateCommand extends OrganizationCommand {
  @IsNotEmpty()
  @IsString()
  readonly integrationId: string;
}
