import { ContextPayload } from '@novu/shared';
import { IsDefined } from 'class-validator';

import { EnvironmentWithUserCommand } from '../../commands';
import { IsValidContextPayload } from '../../decorators';

export class ResolveContextFromPayloadCommand extends EnvironmentWithUserCommand {
  @IsDefined()
  @IsValidContextPayload({ maxCount: 5 })
  context: ContextPayload;
}
