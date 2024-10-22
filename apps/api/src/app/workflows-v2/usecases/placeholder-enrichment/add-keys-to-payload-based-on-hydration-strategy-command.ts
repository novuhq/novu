import { BaseCommand } from '@novu/application-generic';

export class AddKeysToPayloadBasedOnHydrationStrategyCommand extends BaseCommand {
  controlValues: Record<string, string>;
  controlValueKey: string;
}
