import { ResourceKey } from '@novu/shared';
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

  @IsNotEmpty()
  @IsResourceKey()
  readonly resource: ResourceKey;
}
