import { BaseCommand } from '@novu/application-generic';
import { IsNotEmpty } from 'class-validator';

export class GetCopilotSettingsCommand extends BaseCommand {
  @IsNotEmpty()
  readonly organizationId: string;
}
