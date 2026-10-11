import { IsNotEmpty, IsString } from 'class-validator';
import { EnsureBackingOrganizationCommand } from '../ensure-backing-organization/ensure-backing-organization.command';

export class ClaimForHumanAccountCommand extends EnsureBackingOrganizationCommand {
  @IsString()
  @IsNotEmpty()
  token: string;
}
