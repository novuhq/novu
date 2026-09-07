import { IsValidContextPayload } from '@novu/application-generic';
import { ConnectionMode, ContextPayload } from '@novu/shared';
import { Type } from 'class-transformer';
import { IsArray, IsDefined, IsIn, IsOptional, IsString, ValidateNested } from 'class-validator';
import { EnvironmentCommand } from '../../../shared/commands/project.command';
import { AuthDto, WorkspaceDto } from '../../dtos/shared.dto';

export class CreateChannelConnectionCommand extends EnvironmentCommand {
  @IsOptional()
  @IsString()
  identifier?: string;

  @IsDefined()
  @IsString()
  integrationIdentifier: string;

  @IsOptional()
  @IsString()
  subscriberId?: string;

  @IsOptional()
  @IsValidContextPayload({ maxCount: 5 })
  context?: ContextPayload;

  /**
   * Pre-resolved context keys. When provided they are persisted verbatim and the
   * `context` payload is ignored — used by the OAuth callback to carry a
   * session-validated context without re-resolving (and re-trusting) a payload.
   */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  contextKeys?: string[];

  @IsOptional()
  @IsString()
  @IsIn(['subscriber', 'shared'])
  connectionMode?: ConnectionMode;

  @IsDefined()
  @ValidateNested()
  @Type(() => WorkspaceDto)
  workspace: WorkspaceDto;

  @IsDefined()
  @ValidateNested()
  @Type(() => AuthDto)
  auth: AuthDto;
}
