import { BaseCommand, IsNotEmpty } from '@novu/application-generic';
import { IsEnum, IsMongoId, IsOptional, IsString } from 'class-validator';
import { ChatProviderIdEnum } from '@novu/shared';

export class ChatOauthCallbackCommand extends BaseCommand {
  @IsMongoId()
  @IsString()
  readonly environmentId: string;

  @IsNotEmpty()
  @IsEnum(ChatProviderIdEnum)
  readonly providerId: ChatProviderIdEnum;

  @IsNotEmpty()
  @IsString()
  readonly subscriberId: string;

  @IsNotEmpty()
  @IsString()
  readonly providerCode: string;

  readonly hmacHash?: string;

  @IsOptional()
  @IsString()
  readonly integrationIdentifier?: string;
}
