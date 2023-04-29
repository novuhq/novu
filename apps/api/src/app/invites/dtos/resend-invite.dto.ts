import { IsNotEmpty, IsString } from 'class-validator';

export class ResendInviteDto {
  @IsNotEmpty()
  @IsString()
  memberId: string;
}
