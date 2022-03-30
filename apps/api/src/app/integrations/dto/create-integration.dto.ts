import { IsDefined } from 'class-validator';
import { ChannelTypeEnum, ICreateIntegrationBodyDto, ICredentialsDto } from '@novu/shared';

export class CreateIntegrationBodyDto implements ICreateIntegrationBodyDto {
  @IsDefined()
  providerId: string;

  @IsDefined()
  channel: ChannelTypeEnum;

  @IsDefined()
  credentials: ICredentialsDto;

  @IsDefined()
  active: boolean;
}
