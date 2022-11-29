import { IsNotEmpty } from 'class-validator';

export class ResendInviteDto {
  @IsNotEmpty()
  memberId: string;
}
