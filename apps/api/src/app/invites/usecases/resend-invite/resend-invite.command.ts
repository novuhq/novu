import { IsString } from 'class-validator';
import { OrganizationCommand } from '../../../shared/commands/organization.command';

export class ResendInviteCommand extends OrganizationCommand {
  @IsString()
  readonly memberId: string;
}
