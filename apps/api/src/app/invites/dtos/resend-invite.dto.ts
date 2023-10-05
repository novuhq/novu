import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { CustomDataType } from '@novu/shared';

export class ResendInviteDto {
  @IsNotEmpty()
  @IsString()
  memberId: string;

  @IsOptional()
  config?: CustomDataType;
}
