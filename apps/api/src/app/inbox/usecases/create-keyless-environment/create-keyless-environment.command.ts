import { BaseCommand } from '@novu/application-generic';
import { IsEnum } from 'class-validator';

export enum KeylessEnvironmentPurposeEnum {
  INBOX_DEMO = 'inbox-demo',
  AGENT = 'agent',
}

export class CreateKeylessEnvironmentCommand extends BaseCommand {
  @IsEnum(KeylessEnvironmentPurposeEnum)
  purpose: KeylessEnvironmentPurposeEnum;
}
