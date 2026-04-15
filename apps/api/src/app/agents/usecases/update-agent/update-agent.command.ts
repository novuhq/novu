import { Type } from 'class-transformer';
import { IsBoolean, IsNotEmpty, IsOptional, IsString, IsUrl, ValidateIf, ValidateNested } from 'class-validator';

import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';
import { AgentBehaviorDto } from '../../dtos/agent-behavior.dto';

export class UpdateAgentCommand extends EnvironmentWithUserCommand {
  @IsString()
  @IsNotEmpty()
  identifier: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @ValidateIf((_, value) => value !== undefined)
  @IsBoolean()
  active?: boolean;

  @ValidateNested()
  @Type(() => AgentBehaviorDto)
  @IsOptional()
  behavior?: AgentBehaviorDto;

  @IsUrl({ require_tld: false })
  @IsOptional()
  bridgeUrl?: string;

  @IsUrl({ require_tld: false })
  @IsOptional()
  devBridgeUrl?: string;

  @ValidateIf((_, value) => value !== undefined)
  @IsBoolean()
  devBridgeActive?: boolean;
}
