import { IsValidContextPayload } from '@novu/application-generic';
import { ContextPayload } from '@novu/shared';
import { IsArray, IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

import { EnvironmentCommand } from '../../shared/commands/project.command';

export class IssueTelegramSubscriberLinkCommand extends EnvironmentCommand {
  @IsString()
  @IsNotEmpty()
  integrationIdentifier: string;

  @IsString()
  @IsNotEmpty()
  subscriberId: string;

  /**
   * Context to bind to the Telegram endpoint created when the subscriber taps
   * `/start`. Used when pre-resolved `contextKeys` are absent.
   */
  @IsOptional()
  @IsValidContextPayload({ maxCount: 5 })
  context?: ContextPayload;

  /**
   * Pre-resolved context keys from a subscriber session JWT. When present these
   * are persisted verbatim on the endpoint and take precedence over `context`.
   */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  contextKeys?: string[];

  /**
   * HMAC of `context` for integrations with HMAC validation enabled. Not required
   * when `isContextValidated` is true (session already verified the context).
   */
  @IsOptional()
  @IsString()
  contextHash?: string;

  /**
   * True when the subscriber session JWT already carries HMAC-verified contextKeys.
   */
  @IsOptional()
  @IsBoolean()
  isContextValidated?: boolean;
}
