import { IsValidContextPayload } from '@novu/application-generic';
import { ContextPayload } from '@novu/shared';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

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
   * `/start`. Carried through the start-code payload and persisted on the
   * endpoint's `contextKeys`.
   */
  @IsOptional()
  @IsValidContextPayload({ maxCount: 5 })
  context?: ContextPayload;
}
