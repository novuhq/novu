import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { EnsureBackingOrganizationCommand } from '../ensure-backing-organization/ensure-backing-organization.command';

export class ApproveHumanCliLoginCommand extends EnsureBackingOrganizationCommand {
  @IsString()
  @IsNotEmpty()
  deviceCode: string;

  @IsOptional()
  @IsString()
  email?: string;
}
