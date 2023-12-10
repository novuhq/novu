import { IsEmail, IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { MemberRoleEnum } from '@novu/shared';

export class InviteMemberDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  role: 'admin';
}
