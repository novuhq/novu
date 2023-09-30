import { IsEmail, IsEnum, IsNotEmpty } from 'class-validator';
import { MemberRoleEnum } from '@novu/shared';

export class InviteMemberDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsEnum(MemberRoleEnum)
  role: MemberRoleEnum;
}
