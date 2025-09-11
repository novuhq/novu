import { IsDefined, IsString } from 'class-validator';
import { EnvironmentCommand } from '../../../shared/commands/project.command';

export class GetChannelEndpointCommand extends EnvironmentCommand {
  @IsDefined()
  @IsString()
  identifier: string;
}
