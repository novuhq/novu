import { IsEmail, IsEnum, IsNotEmpty } from 'class-validator';
import { MemberRoleEnum } from '@notifire/shared';

export class InviteMemberDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsEnum(MemberRoleEnum)
  role: MemberRoleEnum;
}
