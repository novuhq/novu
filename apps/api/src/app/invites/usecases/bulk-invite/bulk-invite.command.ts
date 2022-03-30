import { MemberRoleEnum } from '@novu/shared';
import { CommandHelper } from '../../../shared/commands/command.helper';
import { OrganizationCommand } from '../../../shared/commands/organization.command';

export class BulkInviteCommand extends OrganizationCommand {
  static create(data: BulkInviteCommand) {
    return CommandHelper.create(BulkInviteCommand, data);
  }

  invitees: {
    email: string;
    role?: MemberRoleEnum;
  }[];
}
