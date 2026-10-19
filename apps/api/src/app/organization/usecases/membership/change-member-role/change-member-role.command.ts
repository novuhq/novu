import { MemberRoleEnum } from '@novu/shared';
import { IsDefined, IsEnum, IsMongoId } from 'class-validator';
import { OrganizationCommand } from '../../../../shared/commands/organization.command';

export class ChangeMemberRoleCommand extends OrganizationCommand {
  @IsDefined()
  role: MemberRoleEnum.OSS_ADMIN;

  @IsDefined()
  @IsMongoId()
  memberId: string;
}
