import { EnvironmentCommand } from '@novu/application-generic';
import { IsDefined, IsString } from 'class-validator';

export class GetSubscriberScheduleCommand extends EnvironmentCommand {
  // database _id
  @IsString()
  @IsDefined()
  _subscriberId: string;
}
