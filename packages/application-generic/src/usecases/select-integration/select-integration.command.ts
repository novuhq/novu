import { IsOptional, IsString } from 'class-validator';

import { EnvironmentCommand } from '../../commands/project.command';

export class SelectIntegrationCommand extends EnvironmentCommand {
  @IsOptional()
  @IsString()
  tenantId?: string;

  @IsOptional()
  @IsString()
  workflowIdentifier?: string;

  @IsOptional()
  @IsString()
  workflowName?: string;

  @IsOptional()
  active?: boolean;
}
