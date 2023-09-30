import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  EnvironmentId,
  OrganizationId,
  ChannelTypeEnum,
  ITemplateVariable,
  LayoutDescription,
  LayoutId,
  LayoutName,
  LayoutIdentifier,
  UserId,
} from '@novu/dal';

export class LayoutDto {
  @ApiPropertyOptional()
  _id?: LayoutId;

  @ApiProperty()
  _organizationId: OrganizationId;

  @ApiProperty()
  _environmentId: EnvironmentId;

  @ApiProperty()
  _creatorId: UserId;

  @ApiProperty()
  name: LayoutName;

  @ApiProperty()
  identifier: LayoutIdentifier;

  @ApiProperty()
  description?: LayoutDescription;

  @ApiProperty()
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
