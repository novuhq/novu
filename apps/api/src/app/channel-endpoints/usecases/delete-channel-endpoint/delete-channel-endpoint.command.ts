import { IsDefined, IsString } from 'class-validator';
import { EnvironmentWithSubscriber } from '../../../shared/commands/project.command';

export class DeleteChannelEndpointCommand extends EnvironmentWithSubscriber {
  @IsString()
  @IsDefined()
  identifier: string;
}
