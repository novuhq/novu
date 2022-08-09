import { IsNotEmpty } from 'class-validator';
import { AuthenticatedCommand } from '../../../shared/commands/authenticated.command';

export class SwitchOrganizationCommand extends AuthenticatedCommand {
  @IsNotEmpty()
  newOrganizationId: string;
}
