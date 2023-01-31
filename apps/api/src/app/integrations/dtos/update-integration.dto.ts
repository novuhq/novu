import { ApiProperty } from '@nestjs/swagger';
import { IUpdateIntegrationBodyDto, ChannelTypeEnum, ICredentialsDto } from '@novu/shared';
import { IsDefined, IsOptional } from 'class-validator';
import { CredentialsDto, LimitsDto } from './credentials.dto';

export class UpdateIntegrationRequestDto implements IUpdateIntegrationBodyDto {
  @ApiProperty()
  @IsDefined()
  active: boolean;

  @ApiProperty({
    type: CredentialsDto,
  })
  @IsDefined()
  credentials: CredentialsDto;

  @IsOptional()
  limits?: LimitsDto;

  @ApiProperty()
  @IsDefined()
  check: boolean;
}
