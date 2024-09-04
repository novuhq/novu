import { IsNotEmpty } from 'class-validator';
import { UpsertSubscriberGlobalPerferencesCommand } from './upsert-subscriber-global-perferences.command';

export class UpsertSubscriberWorkflowPerferencesCommand extends UpsertSubscriberGlobalPerferencesCommand {
  @IsNotEmpty()
  templateId: string;
}
