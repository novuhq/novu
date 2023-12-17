import { IsDefined, IsEmail, IsEnum } from 'class-validator';
import { MemberRoleEnum } from '@novu/shared';
import { OrganizationCommand } from '../../../shared/commands/organization.command';

export class InviteMemberCommand extends OrganizationCommand {
  @IsEmail()
  readonly email: string;

  @IsDefined()
  readonly role: MemberRoleEnum;
}
