import { MemberRoleEnum } from '@novu/shared';
import { IsEnum } from 'class-validator';

export class UpdateMemberRolesDto {
  @IsEnum(MemberRoleEnum)
  role: MemberRoleEnum.OSS_ADMIN;
}
