import { IsValidContextPayload } from '@novu/application-generic';
import { IntegrationEntity } from '@novu/dal';
import { ConnectionMode, ContextPayload } from '@novu/shared';
import { IsArray, IsBoolean, IsIn, IsOptional, IsString } from 'class-validator';
import { EnvironmentCommand } from '../../../../shared/commands/project.command';
import { OAuthMode } from './generate-slack-oauth-url.usecase';

export class GenerateSlackOauthUrlCommand extends EnvironmentCommand {
  @IsOptional()
  @IsString()
  readonly connectionIdentifier?: string;

  @IsOptional()
  @IsString()
  readonly subscriberId?: string;

  readonly integration: IntegrationEntity;

  @IsOptional()
  @IsValidContextPayload({ maxCount: 5 })
  context?: ContextPayload;

  /** Trusted pre-resolved context keys (from the subscriber session); persisted directly when present. */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  readonly contextKeys?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  readonly scope?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  readonly userScope?: string[];

  @IsOptional()
  @IsString()
  @IsIn(['connect', 'link_user'])
  readonly mode?: OAuthMode;

  @IsOptional()
  @IsString()
  @IsIn(['subscriber', 'shared'])
  readonly connectionMode?: ConnectionMode;

  @IsOptional()
  @IsBoolean()
  readonly autoLinkUser?: boolean;
}
