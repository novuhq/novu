import { IsString } from 'class-validator';
import { CommandHelper } from '../../../../shared/commands/command.helper';
import { OrganizationCommand } from '../../../../shared/commands/organization.command';

export class RemoveMemberCommand extends OrganizationCommand {
  static create(data: RemoveMemberCommand) {
    return CommandHelper.create(RemoveMemberCommand, data);
  }

  @IsString()
  memberId: string;
}
