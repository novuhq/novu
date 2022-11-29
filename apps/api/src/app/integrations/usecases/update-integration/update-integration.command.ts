import { IsDefined } from 'class-validator';
import { ICredentialsDto } from '@novu/shared';
import { EnvironmentCommand } from '../../../shared/commands/project.command';

export class UpdateIntegrationCommand extends EnvironmentCommand {
  @IsDefined()
  integrationId: string;

  @IsDefined()
  credentials: ICredentialsDto;

  @IsDefined()
  active: boolean;

  @IsDefined()
  check: boolean;
}
