import { IsString } from 'class-validator';
import { BaseCommand } from '../../../shared/commands/base.command';

export class InviteNudgeWebhookCommand extends BaseCommand {
  headers?: Record<string, string>;

  body?: Record<string, any>;
}
