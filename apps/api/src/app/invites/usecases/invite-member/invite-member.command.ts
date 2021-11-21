import { IsDefined, IsEmail, IsString, IsEnum } from 'class-validator';
import { MemberRoleEnum } from '@notifire/shared';
import { CommandHelper } from '../../../shared/commands/command.helper';
import { OrganizationCommand } from '../../../shared/commands/organization.command';

export class InviteMemberCommand extends OrganizationCommand {
  static create(data: InviteMemberCommand) {
    return CommandHelper.create(InviteMemberCommand, data);
  }

  @IsEmail()
  readonly email: string;

  @IsDefined()
  @IsEnum(MemberRoleEnum)
  readonly role: MemberRoleEnum;
}
