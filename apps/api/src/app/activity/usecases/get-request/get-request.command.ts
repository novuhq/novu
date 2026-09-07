import { EnvironmentCommand } from '@novu/application-generic';
import { IsString } from 'class-validator';

export class GetRequestCommand extends EnvironmentCommand {
  @IsString()
  requestId: string;
}
