import { MemberRoleEnum } from '@novu/shared';
import { IsDefined, IsEnum } from 'class-validator';
import { OrganizationCommand } from '../../../../../shared/commands/organization.command';
import { CommandHelper } from '../../../../../shared/commands/command.helper';

export class ChangeMemberRoleCommand extends OrganizationCommand {
  static create(data: ChangeMemberRoleCommand) {
    return CommandHelper.create(ChangeMemberRoleCommand, data);
  }

  @IsEnum(MemberRoleEnum)
  @IsDefined()
  role: MemberRoleEnum;

  @IsDefined()
  memberId: string;
}
