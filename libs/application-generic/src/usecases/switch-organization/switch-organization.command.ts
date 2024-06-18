import { IsNotEmpty, IsOptional } from 'class-validator';
import { AuthenticatedCommand } from '../../commands';

export class SwitchOrganizationCommand extends AuthenticatedCommand {
  @IsNotEmpty()
  newOrganizationId: string;
}
