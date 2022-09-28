import { IsDefined } from 'class-validator';
import { ChannelTypeEnum, ICreateIntegrationBodyDto } from '@novu/shared';
import { ApiProperty } from '@nestjs/swagger';
import { CredentialsDto } from './credentials.dto';

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

  @ApiProperty()
  @IsDefined()
  active: boolean;

  @ApiProperty()
  @IsDefined()
  check: boolean;
}
