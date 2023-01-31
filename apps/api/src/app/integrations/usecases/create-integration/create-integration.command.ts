import { IsDefined, IsOptional } from 'class-validator';
import { ChannelTypeEnum, ICredentialsDto, ILimitsDto } from '@novu/shared';
import { EnvironmentCommand } from '../../../shared/commands/project.command';

export class CreateIntegrationCommand extends EnvironmentCommand {
  @IsDefined()
  providerId: string;

  @IsDefined()
  channel: ChannelTypeEnum;

  @IsDefined()
  credentials: ICredentialsDto;

  @IsOptional()
  limits?: ILimitsDto;

  @IsDefined()
  active: boolean;

  @IsDefined()
  check: boolean;

  @IsOptional()
  userId?: string;
}
