import { IsValidContextPayload } from '@novu/application-generic';
import { ConnectionMode, ContextPayload } from '@novu/shared';
import { IsArray, IsBoolean, IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { EnvironmentCommand } from '../../../shared/commands/project.command';

export class GenerateConnectOauthUrlCommand extends EnvironmentCommand {
  @IsNotEmpty()
  @IsString()
  readonly integrationIdentifier: string;

  @IsOptional()
  @IsString()
  readonly connectionIdentifier?: string;

  @IsOptional()
  @IsString()
  readonly subscriberId?: string;

  @IsOptional()
  @IsValidContextPayload({ maxCount: 5 })
  readonly context?: ContextPayload;

  /**
   * Pre-resolved context keys taken from the subscriber session (`contextKeys`)
   * when the Inbox session already carried a context. When present these are the
   * trusted source of truth and are persisted directly on the connection — the
   * raw `context` payload is only a fallback for sessions without contextKeys.
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
  readonly scope?: string[];

  @IsOptional()
  @IsString()
  @IsIn(['subscriber', 'shared'])
  readonly connectionMode?: ConnectionMode;

  @IsOptional()
  @IsBoolean()
  readonly autoLinkUser?: boolean;
}
