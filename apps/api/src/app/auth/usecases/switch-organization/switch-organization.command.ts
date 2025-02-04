import { IsNotEmpty } from 'class-validator';
import { AuthenticatedCommand } from '@novu/application-generic';

export class SwitchOrganizationCommand extends AuthenticatedCommand {
  @IsNotEmpty()
  newOrganizationId: string;
}
