import { IsArray, IsNumber, IsOptional } from 'class-validator';
import { EnvironmentWithSubscriber } from '../../../shared/commands/project.command';

export class GetNotificationsFeedCommand extends EnvironmentWithSubscriber {
  @IsNumber()
  @IsOptional()
  page?: number = 0;

  @IsOptional()
  @IsArray()
  feedId: string[];

  @IsOptional()
  seen?: boolean;
}
