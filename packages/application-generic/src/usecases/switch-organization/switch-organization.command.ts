import { IsNotEmpty } from 'class-validator';
import { AuthenticatedCommand } from '../../commands';

export class SwitchOrganizationCommand extends AuthenticatedCommand {
  @IsNotEmpty()
  newOrganizationId: string;
}
