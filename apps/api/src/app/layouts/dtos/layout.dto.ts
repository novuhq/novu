import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ChannelTypeEnum,
  EnvironmentId,
  IEmailBlock,
  ITemplateVariable,
  OrganizationId,
  LayoutDescription,
  LayoutId,
  LayoutName,
  UserId,
} from '../types';

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
  description?: LayoutDescription;

  @ApiProperty()
  channel: ChannelTypeEnum;

  @ApiProperty()
  content: IEmailBlock[];

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
}
