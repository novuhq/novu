import { MemberRoleEnum } from '@novu/shared';
import { ArrayNotEmpty } from 'class-validator';
import { OrganizationCommand } from '../../../../shared/commands/organization.command';

export class AddMemberCommand extends OrganizationCommand {
  @ArrayNotEmpty()
  public readonly roles: MemberRoleEnum[];
}
