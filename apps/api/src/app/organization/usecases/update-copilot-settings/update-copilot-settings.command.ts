import { AuthenticatedCommand } from '@novu/application-generic';
import { IsBoolean, IsNotEmpty, IsOptional } from 'class-validator';

export class UpdateCopilotSettingsCommand extends AuthenticatedCommand {
  @IsNotEmpty()
  readonly organizationId: string;

  @IsOptional()
  @IsBoolean()
  readonly dashboardEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  readonly slackEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  readonly editsEnabled?: boolean;
}
