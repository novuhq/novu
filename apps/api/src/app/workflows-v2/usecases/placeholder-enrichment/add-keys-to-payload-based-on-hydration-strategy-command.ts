import { BaseCommand } from '@novu/application-generic';
import { GeneratePreviewRequestDto } from '@novu/shared';

export class AddKeysToPayloadBasedOnHydrationStrategyCommand extends BaseCommand {
  dto: GeneratePreviewRequestDto;
  controlValueKey: string;
}
