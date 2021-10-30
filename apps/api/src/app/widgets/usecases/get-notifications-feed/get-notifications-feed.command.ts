import { IsNumber, IsPositive } from 'class-validator';
import { CommandHelper } from '../../../shared/commands/command.helper';
import { ApplicationWithSubscriber } from '../../../shared/commands/project.command';

export class GetNotificationsFeedCommand extends ApplicationWithSubscriber {
  static create(data: GetNotificationsFeedCommand) {
    return CommandHelper.create<GetNotificationsFeedCommand>(GetNotificationsFeedCommand, data);
  }

  @IsNumber()
  page: number;
}
