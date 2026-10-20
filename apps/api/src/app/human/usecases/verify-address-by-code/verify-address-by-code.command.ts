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

  /**
   * The contact this code must belong to. Set by the invite and the operator session.
   * A code issued for someone else is refused and left unused.
   */
  @IsOptional()
  @IsString()
  expectedEnv?: string;

  @IsOptional()
  @IsString()
  expectedAgentId?: string;

  @IsOptional()
  @IsString()
  expectedSubscriberId?: string;

  /**
   * The send this code must belong to. The CLI passes the `requestedAt` it is waiting on,
   * so a code mailed for a different send is refused and left unused.
   */
  @IsOptional()
  @IsString()
  expectedRequestedAt?: string;
}
