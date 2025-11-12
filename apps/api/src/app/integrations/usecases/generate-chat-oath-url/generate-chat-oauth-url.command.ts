import { IsValidContextPayload } from '@novu/application-generic';
import { ContextPayload } from '@novu/shared';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { EnvironmentCommand } from '../../../shared/commands/project.command';

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
}
