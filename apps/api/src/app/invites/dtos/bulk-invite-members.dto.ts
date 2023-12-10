import { IBulkInviteRequestDto, CustomDataType } from '@novu/shared';
import { Type } from 'class-transformer';
import { ArrayNotEmpty, IsArray, IsOptional, IsDefined, IsEmail, IsNotEmpty, ValidateNested } from 'class-validator';

class EmailInvitee {
  @IsDefined()
  @IsNotEmpty()
  @IsEmail()
  email: string;
  @IsOptional()
  config?: CustomDataType;
}

export class BulkInviteMembersDto implements IBulkInviteRequestDto {
  @ArrayNotEmpty()
  @IsArray()
  @ValidateNested()
  @Type(() => EmailInvitee)
  invitees: EmailInvitee[];
  @IsOptional()
  config?: CustomDataType;
}
