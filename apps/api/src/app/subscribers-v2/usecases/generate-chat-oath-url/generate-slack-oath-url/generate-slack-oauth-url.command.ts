import { IsNotEmpty, IsString } from 'class-validator';
import { EnvironmentWithSubscriber } from '../../../../shared/commands/project.command';

export class GenerateSlackOauthUrlCommand extends EnvironmentWithSubscriber {
  @IsNotEmpty()
  @IsString()
  readonly integrationIdentifier: string;
}
