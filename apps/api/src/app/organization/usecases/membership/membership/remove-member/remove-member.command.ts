import { IsString } from 'class-validator';
import { OrganizationCommand } from '../../../../../shared/commands/organization.command';
import { CommandHelper } from '../../../../../shared/commands/command.helper';

export class RemoveMemberCommand extends OrganizationCommand {
  static create(data: RemoveMemberCommand) {
    return CommandHelper.create(RemoveMemberCommand, data);
  }

  @IsString()
  memberId: string;
}
