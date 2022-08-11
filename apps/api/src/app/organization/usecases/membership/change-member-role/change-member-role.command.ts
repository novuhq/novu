import { MemberRoleEnum } from '@novu/shared';
import { IsDefined, IsEnum } from 'class-validator';
import { OrganizationCommand } from '../../../../shared/commands/organization.command';

export class ChangeMemberRoleCommand extends OrganizationCommand {
  @IsEnum(MemberRoleEnum)
  @IsDefined()
  role: MemberRoleEnum;

  @IsDefined()
  memberId: string;
}
