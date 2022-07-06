import { IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';
import { CommandHelper } from '../../../shared/commands/command.helper';
import { EnvironmentWithSubscriber } from '../../../shared/commands/project.command';

export class GetNotificationsFeedCommand extends EnvironmentWithSubscriber {
  static create(data: GetNotificationsFeedCommand) {
    return CommandHelper.create<GetNotificationsFeedCommand>(GetNotificationsFeedCommand, data);
  }

  @IsNumber()
  page: number;

  @IsString()
  @IsOptional()
  feedId: string;
}
