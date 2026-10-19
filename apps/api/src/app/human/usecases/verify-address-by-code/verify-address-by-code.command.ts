import { BaseCommand } from '@novu/application-generic';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class VerifyAddressByCodeCommand extends BaseCommand {
  @IsString()
  @IsNotEmpty()
  code: string;

  /** The address the code was sent to. Exactly one of this and `inviteToken`. */
  @IsOptional()
  @IsString()
  address?: string;

  /** Invite link token. The pending address is read from the contact it names. */
  @IsOptional()
  @IsString()
  inviteToken?: string;

  @IsOptional()
  @IsString()
  clientIp?: string;
}
