import { IsArray, IsNumber, IsOptional } from 'class-validator';
import { EnvironmentWithSubscriber } from '../../../shared/commands/project.command';

export class GetNotificationsFeedCommand extends EnvironmentWithSubscriber {
  @IsNumber()
  page: number;

  @IsOptional()
  @IsArray()
  feedId: string[];

  @IsOptional()
  seen?: boolean;
}
