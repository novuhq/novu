import { IsNumber, IsPositive } from 'class-validator';
import { CommandHelper } from '../../../shared/commands/command.helper';
import { EnvironmentWithSubscriber } from '../../../shared/commands/project.command';

export class GetNotificationsFeedCommand extends EnvironmentWithSubscriber {
  static create(data: GetNotificationsFeedCommand) {
    return CommandHelper.create<GetNotificationsFeedCommand>(GetNotificationsFeedCommand, data);
  }

  @IsNumber()
  page: number;
}
