import { IsDefined } from 'class-validator';
import { TriggerRecipientsPayload } from '@novu/node';

import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class MapTriggerRecipientsCommand extends EnvironmentWithUserCommand {
  @IsDefined()
  recipients: TriggerRecipientsPayload;

  @IsDefined()
  transactionId: string;
}
