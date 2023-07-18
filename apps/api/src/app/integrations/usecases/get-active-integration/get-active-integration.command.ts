import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';
import { IsOptional } from 'class-validator';
import { ProvidersIdEnum } from '@novu/shared';

export class GetActiveIntegrationsCommand extends EnvironmentWithUserCommand {
  @IsOptional()
  providerId?: ProvidersIdEnum;
}
