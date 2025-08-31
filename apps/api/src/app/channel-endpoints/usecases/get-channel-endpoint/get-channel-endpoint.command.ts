import { IsDefined, IsString } from 'class-validator';
import { EnvironmentWithSubscriber } from '../../../shared/commands/project.command';

export class GetChannelEndpointCommand extends EnvironmentWithSubscriber {
  @IsString()
  @IsDefined()
  identifier: string;
}
