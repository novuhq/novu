import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ChannelTypeEnum } from '@novu/shared';
import { CredentialsDto } from './credentials.dto';

export class IntegrationResponseDto {
  @ApiPropertyOptional()
  _id?: string;

  @ApiProperty()
  _environmentId: string;

  @ApiProperty()
  _organizationId: string;

  @ApiProperty()
  providerId: string;

  @ApiProperty({
    enum: ChannelTypeEnum,
  })
  channel: ChannelTypeEnum;

  @ApiProperty({
    type: CredentialsDto,
  })
  credentials: CredentialsDto;

  @ApiProperty()
  active: boolean;

  @ApiProperty()
  deleted: boolean;

  @ApiProperty()
  deletedAt: string;

  @ApiProperty()
  deletedBy: string;
}
