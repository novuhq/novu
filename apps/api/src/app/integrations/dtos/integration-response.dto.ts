import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ChannelTypeEnum } from '@novu/shared';
import { StepFilter } from '../../shared/dtos/step-filter';
import { CredentialsDto } from './credentials.dto';

export class IntegrationResponseDto {
  @ApiPropertyOptional()
  _id?: string;

  @ApiProperty()
  _environmentId: string;

  @ApiProperty()
  _organizationId: string;

  @ApiProperty({ type: String })
  name: string;

  @ApiProperty({ type: String })
  identifier: string;

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

  @ApiProperty()
  primary: boolean;

  @ApiPropertyOptional({
    type: [StepFilter],
  })
  conditions?: StepFilter[];
}
