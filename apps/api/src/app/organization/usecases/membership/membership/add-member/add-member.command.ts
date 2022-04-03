import { MemberRoleEnum } from '@novu/shared';
import { ArrayNotEmpty } from 'class-validator';
import { OrganizationCommand } from '../../../../../shared/commands/organization.command';
import { CommandHelper } from '../../../../../shared/commands/command.helper';

export class AddMemberCommand extends OrganizationCommand {
  static create(data: AddMemberCommand) {
    return CommandHelper.create(AddMemberCommand, data);
  }

  @ArrayNotEmpty()
  public readonly roles: MemberRoleEnum[];
}
