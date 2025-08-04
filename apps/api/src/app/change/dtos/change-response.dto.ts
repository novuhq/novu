import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ChangeEntityTypeEnum } from '@novu/shared';

export class ChangeResponseDto {
  @ApiPropertyOptional()
  _id?: string;

  @ApiProperty()
  _creatorId: string;

  @ApiProperty()
  _environmentId: string;

  @ApiProperty()
  _organizationId: string;

  @ApiProperty()
  _entityId: string;

  @ApiProperty()
  enabled: boolean;

  @ApiProperty({
    enum: ChangeEntityTypeEnum,
  })
  type: ChangeEntityTypeEnum;

  @ApiProperty()
  change: any;

  @ApiProperty()
  createdAt: string;

  @ApiPropertyOptional()
  _parentId?: string;
}

export class ChangesResponseDto {
  @ApiProperty()
  totalCount: number;

  @ApiProperty()
  data: ChangeResponseDto[];

  @ApiProperty()
  pageSize: number;

  @ApiProperty()
  page: number;
}
