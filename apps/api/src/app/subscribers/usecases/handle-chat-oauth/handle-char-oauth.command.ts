import { BaseCommand } from '@novu/application-generic';
import { IsNotEmpty } from 'class-validator';
import { ChatProviderIdEnum } from '@novu/shared';

export class HandleCharOauthCommand extends BaseCommand {
  @IsNotEmpty()
  readonly environmentId: string;

  @IsNotEmpty()
  readonly providerId: ChatProviderIdEnum;

  @IsNotEmpty()
  readonly subscriberId: string;

  @IsNotEmpty()
  readonly providerCode: string;
}
