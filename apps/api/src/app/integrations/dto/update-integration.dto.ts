import { IUpdateIntegrationBodyDto, ChannelTypeEnum, ICredentialsDto } from '@notifire/shared';
import { IsDefined } from 'class-validator';

export class UpdateIntegrationBodyDto implements IUpdateIntegrationBodyDto {
  @IsDefined()
  active: boolean;

  @IsDefined()
  credentials: ICredentialsDto;
}
