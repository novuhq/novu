import { IsValidContextPayload } from '@novu/application-generic';
import { IntegrationEntity } from '@novu/dal';
import { ContextPayload } from '@novu/shared';
import { IsBoolean, IsIn, IsOptional, IsString } from 'class-validator';
import { EnvironmentCommand } from '../../../../shared/commands/project.command';
import { OAuthMode } from './generate-msteams-oauth-url.usecase';

export class GenerateMsTeamsOauthUrlCommand extends EnvironmentCommand {
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

  @IsOptional()
  @IsString()
  @IsIn(['connect', 'link_user'])
  readonly mode?: OAuthMode;

  @IsOptional()
  @IsBoolean()
  readonly autoLinkUser?: boolean;
}
