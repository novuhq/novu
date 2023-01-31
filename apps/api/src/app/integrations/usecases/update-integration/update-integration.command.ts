import { IsDefined, IsOptional } from 'class-validator';
import { ICredentialsDto, ILimitsDto } from '@novu/shared';
import { EnvironmentCommand } from '../../../shared/commands/project.command';

export class UpdateIntegrationCommand extends EnvironmentCommand {
  @IsDefined()
  integrationId: string;

  @IsDefined()
  credentials: ICredentialsDto;

  @IsOptional()
  limits?: ILimitsDto;

  @IsDefined()
  active: boolean;

  @IsDefined()
  check: boolean;
}
