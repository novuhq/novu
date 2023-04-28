import { IsBoolean, IsDefined, IsEnum, IsString, ValidateNested } from 'class-validator';
import { ChannelTypeEnum, ICreateIntegrationBodyDto } from '@novu/shared';
import { CredentialsDto } from './credentials.dto';
import { ApiProperty } from '@nestjs/swagger';

export class CreateIntegrationRequestDto implements ICreateIntegrationBodyDto {
  @ApiProperty()
  @IsDefined()
  @IsString()
  providerId: string;

  @ApiProperty({
    enum: ChannelTypeEnum,
  })
  @IsDefined()
  @IsEnum(ChannelTypeEnum)
  channel: ChannelTypeEnum;

  @ApiProperty({
    type: CredentialsDto,
  })
  @IsDefined()
  @ValidateNested()
  credentials: CredentialsDto;

  @ApiProperty()
  @IsDefined()
  @IsBoolean()
  active: boolean;

  @ApiProperty()
  @IsDefined()
  @IsBoolean()
  check: boolean;
}
