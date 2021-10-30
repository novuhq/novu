import { MemberRoleEnum } from '@notifire/shared';
import { ArrayNotEmpty } from 'class-validator';
import { CommandHelper } from '../../../../shared/commands/command.helper';
import { OrganizationCommand } from '../../../../shared/commands/organization.command';

export class AddMemberCommand extends OrganizationCommand {
  static create(data: AddMemberCommand) {
    return CommandHelper.create(AddMemberCommand, data);
  }

  @ArrayNotEmpty()
  public readonly roles: MemberRoleEnum[];
}
