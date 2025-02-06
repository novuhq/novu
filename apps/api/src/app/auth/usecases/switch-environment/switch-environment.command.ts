import { IsNotEmpty } from 'class-validator';
import { OrganizationCommand } from '@novu/application-generic';

export class SwitchEnvironmentCommand extends OrganizationCommand {
  @IsNotEmpty()
  newEnvironmentId: string;
}
