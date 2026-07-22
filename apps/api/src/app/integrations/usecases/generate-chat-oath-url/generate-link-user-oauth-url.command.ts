import { IsValidContextPayload } from '@novu/application-generic';
import { ContextPayload } from '@novu/shared';
import { IsArray, IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { EnvironmentCommand } from '../../../shared/commands/project.command';

export class GenerateLinkUserOauthUrlCommand extends EnvironmentCommand {
  @IsNotEmpty()
  @IsString()
  readonly integrationIdentifier: string;

  @IsNotEmpty()
  @IsString()
  readonly subscriberId: string;

  @IsOptional()
  @IsString()
  readonly connectionIdentifier?: string;

  @IsOptional()
  @IsValidContextPayload({ maxCount: 5 })
  readonly context?: ContextPayload;

  /**
   * Pre-resolved context keys taken from the subscriber session (`contextKeys`)
   * when the Inbox session already carried a context. When present these are the
   * trusted source of truth and are persisted directly on the per-user endpoint —
   * the raw `context` payload is only a fallback for sessions without contextKeys.
   */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  readonly contextKeys?: string[];

  @IsOptional()
  @IsString()
  readonly contextHash?: string;

  @IsOptional()
  @IsBoolean()
  readonly isContextValidated?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  readonly userScope?: string[];
}
