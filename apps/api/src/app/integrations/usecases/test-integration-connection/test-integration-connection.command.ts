import { IsMongoId, IsNotEmpty } from 'class-validator';
import { EnvironmentCommand } from '../../../shared/commands/project.command';

export class TestIntegrationConnectionCommand extends EnvironmentCommand {
  @IsNotEmpty()
  @IsMongoId()
  readonly integrationId: string;
}
