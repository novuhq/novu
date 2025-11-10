import { IsValidContextPayload } from '@novu/application-generic';
import { ContextPayload, ResourceKey } from '@novu/shared';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { EnvironmentCommand } from '../../../shared/commands/project.command';
import { IsResourceKey } from '../../../shared/validators/resource-key.validator';

export class GenerateChatOauthUrlCommand extends EnvironmentCommand {
  @IsNotEmpty()
  @IsString()
  readonly integrationIdentifier: string;

  @IsOptional()
  @IsString()
  readonly connectionIdentifier?: string;

  @IsOptional()
  @IsResourceKey()
  readonly resource?: ResourceKey;

  @IsOptional()
  @IsValidContextPayload({ maxCount: 5 })
  readonly context?: ContextPayload;
}
