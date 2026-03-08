import { ApiExtraModels, ApiProperty, ApiPropertyOptional, getSchemaPath } from '@nestjs/swagger';
import { ChannelTypeEnum, ITemplateVariable } from '@novu/dal';
import { ResourceOriginEnum, ResourceTypeEnum, UiSchemaGroupEnum, UiSchemaProperty } from '@novu/shared';
import { Type } from 'class-transformer';
import { IsOptional, ValidateNested } from 'class-validator';
import { JSONSchemaDto } from '../../dtos';

@ApiExtraModels(UiSchemaProperty)
export class UiSchema {
  @ApiPropertyOptional({
    description: 'Group of the UI Schema',
    enum: [...Object.values(UiSchemaGroupEnum)],
    enumName: 'UiSchemaGroupEnum',
  })
  @IsOptional()
  group?: UiSchemaGroupEnum;

  @ApiPropertyOptional({
    description: 'Properties of the UI Schema',
    type: 'object',
    additionalProperties: {
      $ref: getSchemaPath(UiSchemaProperty),
    },
  })
  @IsOptional()
  @ValidateNested()
  properties?: Record<string, UiSchemaProperty>;
}

export class ControlsMetadataDto {
  @ApiPropertyOptional({
    description: 'JSON Schema for data',
    additionalProperties: true,
    type: () => Object,
  })
  @IsOptional()
  @ValidateNested()
  dataSchema?: JSONSchemaDto;

  @ApiPropertyOptional({
    description: 'UI Schema for rendering',
    type: UiSchema,
  })
  @IsOptional()
  @ValidateNested()
  uiSchema?: UiSchema;

  [key: string]: any;
}

export class LayoutDtoV0 {
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

  @ApiProperty()
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

  @ApiPropertyOptional()
  isTranslationEnabled?: boolean;
}
