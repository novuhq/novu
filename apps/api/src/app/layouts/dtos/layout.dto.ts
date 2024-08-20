import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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
  content: string;

  @ApiProperty()
  contentType: string;

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
  _parentId?: string;
}
