import { IsDefined } from 'class-validator';
import { ChannelTypeEnum, ICreateIntegrationBodyDto } from '@novu/shared';
import { CredentialsDto, LimitsDto } from './credentials.dto';
import { ApiProperty } from '@nestjs/swagger';

export class CreateIntegrationRequestDto implements ICreateIntegrationBodyDto {
  @ApiProperty()
  @IsDefined()
  providerId: string;

  @ApiProperty({
    enum: ChannelTypeEnum,
  })
  @IsDefined()
  channel: ChannelTypeEnum;

  @ApiProperty({
    type: CredentialsDto,
  })
  @IsDefined()
  credentials: CredentialsDto;

  @IsDefined()
  limits: LimitsDto;

  @ApiProperty()
  @IsDefined()
  active: boolean;

  @ApiProperty()
  @IsDefined()
  check: boolean;
}
