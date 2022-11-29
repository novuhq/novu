import { ApiProperty } from '@nestjs/swagger';
import { IUpdateIntegrationBodyDto, ChannelTypeEnum, ICredentialsDto } from '@novu/shared';
import { IsDefined } from 'class-validator';
import { CredentialsDto } from './credentials.dto';

export class UpdateIntegrationRequestDto implements IUpdateIntegrationBodyDto {
  @ApiProperty()
  @IsDefined()
  active: boolean;

  @ApiProperty({
    type: CredentialsDto,
  })
  @IsDefined()
  credentials: CredentialsDto;

  @ApiProperty()
  @IsDefined()
  check: boolean;
}
