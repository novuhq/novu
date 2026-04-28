import { IsValidContextPayload } from '@novu/application-generic';
import { ConnectionMode, ContextPayload } from '@novu/shared';
import { IsArray, IsBoolean, IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { EnvironmentCommand } from '../../../shared/commands/project.command';
import type { OAuthMode } from './generate-slack-oath-url/generate-slack-oauth-url.usecase';

export class GenerateChatOauthUrlCommand extends EnvironmentCommand {
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
