import { ChatProviderIdEnum, ResourceKey } from '@novu/shared';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { EnvironmentCommand } from '../../../shared/commands/project.command';
import { IsResourceKey } from '../../../shared/validators/resource-key.validator';

export class GenerateChatOauthUrlCommand extends EnvironmentCommand {
  @IsNotEmpty()
  @IsString()
  readonly integrationIdentifier: string;

  @IsNotEmpty()
  @IsEnum(ChatProviderIdEnum)
  readonly providerId: ChatProviderIdEnum;

  @IsNotEmpty()
  @IsResourceKey()
  readonly resource: ResourceKey;
}
