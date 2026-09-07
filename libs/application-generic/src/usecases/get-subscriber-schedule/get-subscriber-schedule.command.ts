import { IsArray, IsDefined, IsOptional, IsString } from 'class-validator';
import { EnvironmentCommand } from '../../commands';

export class GetSubscriberScheduleCommand extends EnvironmentCommand {
  // database _id
  @IsString()
  @IsDefined()
  _subscriberId: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  readonly contextKeys?: string[];
}
