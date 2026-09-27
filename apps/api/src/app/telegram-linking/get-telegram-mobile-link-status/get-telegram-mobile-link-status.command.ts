import { BaseCommand } from '@novu/application-generic';
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class GetTelegramMobileLinkStatusCommand extends BaseCommand {
  @IsString()
  @IsNotEmpty()
  token: string;

  /**
   * Re-arm the token's sliding expiry before reporting status. Sent by the
   * landing page while it is open; the CLI's own poll leaves it unset.
   */
  @IsOptional()
  @IsBoolean()
  extend?: boolean;
}
