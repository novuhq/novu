import { IsDefined } from 'class-validator';
import { ChannelTypeEnum } from '@notifire/shared';

export class CredentialsDto {
  apiKey: string;

  secretKey: string;
}
export class CreateIntegrationBodyDto {
  @IsDefined()
  providerId: string;

  @IsDefined()
  channel: ChannelTypeEnum;

  @IsDefined()
  credentials: CredentialsDto;

  @IsDefined()
  active: boolean;
}
