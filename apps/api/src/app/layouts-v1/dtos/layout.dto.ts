import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserEntity } from '@novu/dal';
import { ResourceOriginEnum, ResourceTypeEnum } from '@novu/shared';
import { Type } from 'class-transformer';
import { ControlsMetadataDto } from '../../workflows-v2/dtos/controls-metadata.dto';
import { ChannelTypeEnum, ITemplateVariable } from '../types';

export class LayoutDto {
  @ApiPropertyOptional()
  _id?: string;

  @ApiProperty()
  _organizationId: string;

  @ApiProperty()
  _environmentId: string;

  @ApiProperty()
  _creatorId: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  identifier: string;

  @ApiProperty()
  description?: string;

  @ApiProperty({
    enum: ChannelTypeEnum,
  })
  channel: ChannelTypeEnum;

  @ApiProperty()
  content?: string;

  @ApiProperty()
  contentType?: string;

  @ApiPropertyOptional()
  variables?: ITemplateVariable[];

  @ApiProperty()
  isDefault: boolean;

  @ApiProperty()
  isDeleted: boolean;

  @ApiPropertyOptional()
  createdAt?: string;

  @ApiPropertyOptional()
  updatedAt?: string;

  @ApiPropertyOptional()
  updatedBy?: UserEntity;

  @ApiPropertyOptional()
  _parentId?: string;

  @ApiPropertyOptional()
  type?: ResourceTypeEnum;

  @ApiPropertyOptional()
  origin?: ResourceOriginEnum;

  @ApiProperty({
    description: 'Controls metadata for the layout',
    type: () => ControlsMetadataDto,
    required: true,
  })
  @Type(() => ControlsMetadataDto)
  controls: ControlsMetadataDto;
}
