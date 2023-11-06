import { Type } from 'class-transformer';
import { IsBoolean, IsDefined, IsOptional, IsString, ValidateNested } from 'class-validator';

import { PreferenceChannels } from '../../../shared/dtos/preference-channels';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class CreateWorkflowOverrideCommand extends EnvironmentWithUserCommand {
  @IsString()
  @IsOptional()
  triggerIdentifier?: string;

  @IsString()
  @IsOptional()
  _workflowId?: string;

  @IsString()
  @IsDefined()
  tenantIdentifier: string;

  @IsBoolean()
  @IsOptional()
  active?: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => PreferenceChannels)
  preferenceSettings?: PreferenceChannels;
}
