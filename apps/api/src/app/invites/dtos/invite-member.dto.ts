import { IsEmail, IsEnum, IsNotEmpty, IsOptional } from 'class-validator';
import { CustomDataType, MemberRoleEnum } from '@novu/shared';
export class InviteMemberDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsEnum(MemberRoleEnum)
  role: MemberRoleEnum;
  @IsOptional()
  config?: CustomDataType;
}
