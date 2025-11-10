import { IsValidContextPayload } from '@novu/application-generic';
import { IntegrationEntity } from '@novu/dal';
import { ContextPayload, ResourceKey } from '@novu/shared';
import { IsOptional, IsString } from 'class-validator';
import { EnvironmentCommand } from '../../../../shared/commands/project.command';
import { IsResourceKey } from '../../../../shared/validators/resource-key.validator';

export class GenerateSlackOauthUrlCommand extends EnvironmentCommand {
  @IsOptional()
  @IsString()
  readonly connectionIdentifier?: string;

  @IsOptional()
  @IsResourceKey()
  readonly resource?: ResourceKey;

  readonly integration: IntegrationEntity;

  @IsOptional()
  @IsValidContextPayload({ maxCount: 5 })
  context?: ContextPayload;
}
