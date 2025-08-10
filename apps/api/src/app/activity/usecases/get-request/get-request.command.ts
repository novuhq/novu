import { IsString } from 'class-validator';
import { EnvironmentCommand } from '@novu/application-generic';

export class GetRequestCommand extends EnvironmentCommand {
  @IsString()
  requestId: string;
}
