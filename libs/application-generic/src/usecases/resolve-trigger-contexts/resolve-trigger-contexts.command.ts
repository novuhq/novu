import { ContextPayload } from '@novu/shared';
import { IsDefined } from 'class-validator';

import { EnvironmentWithUserCommand } from '../../commands';

export class ResolveTriggerContextsCommand extends EnvironmentWithUserCommand {
  @IsDefined()
  context: ContextPayload;
}
