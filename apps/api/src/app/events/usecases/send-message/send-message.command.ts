import { IsDefined, IsOptional, IsString } from 'class-validator';
import { CommandHelper } from '../../../shared/commands/command.helper';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';
import { NotificationStepEntity } from '@novu/dal';

export class SendMessageCommand extends EnvironmentWithUserCommand {
  static create(data: SendMessageCommand) {
    return CommandHelper.create(SendMessageCommand, data);
  }

  @IsDefined()
  @IsString()
  identifier: string;

  @IsDefined()
  payload: any; // eslint-disable-line @typescript-eslint/no-explicit-any

  @IsDefined()
  overrides: Record<string, Record<string, unknown>>;

  @IsDefined()
  step: NotificationStepEntity; // eslint-disable-line @typescript-eslint/no-explicit-any

  @IsString()
  @IsDefined()
  transactionId: string;

  @IsDefined()
  notificationId: string;

  @IsDefined()
  subscriberId: string;

  @IsDefined()
  jobId: string;

  @IsOptional()
  events?: any[];
}
