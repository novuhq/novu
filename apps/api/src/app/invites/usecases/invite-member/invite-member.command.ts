import { IsDefined, IsEmail, IsEnum, IsOptional } from 'class-validator';
import { MemberRoleEnum } from '@novu/shared';
import { OrganizationCommand } from '../../../shared/commands/organization.command';
import { CustomDataType } from '@novu/shared';
export class InviteMemberCommand extends OrganizationCommand {
  @IsEmail()
  readonly email: string;

  @IsDefined()
  @IsEnum(MemberRoleEnum)
  readonly role: MemberRoleEnum;

  @IsOptional()
  config?: CustomDataType;
}
