import { IsArray, IsBoolean, IsDefined, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';
import {
  BuilderFieldOperator,
  BuilderFieldType,
  BuilderGroupValues,
  ICreateNotificationTemplateDto,
  IPreferenceChannels,
} from '@novu/shared';
import { MessageTemplateDto } from './message-template.dto';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PreferenceChannels } from '../../widgets/dtos/update-subscriber-preference-response.dto';

class MessageFilterChild {
  @ApiProperty()
  field: string;
  @ApiProperty()
  value: string;
  @ApiProperty({
    enum: [
      'LARGER',
      'SMALLER',
      'LARGER_EQUAL',
      'SMALLER_EQUAL',
      'EQUAL',
      'NOT_EQUAL',
      'ALL_IN',
      'ANY_IN',
      'NOT_IN',
      'BETWEEN',
      'NOT_BETWEEN',
      'LIKE',
      'NOT_LIKE',
    ],
  })
  operator: BuilderFieldOperator;
}

export class MessageFilter {
  @ApiProperty()
  isNegated: boolean;

  @ApiProperty({
    enum: ['BOOLEAN', 'TEXT', 'DATE', 'NUMBER', 'STATEMENT', 'LIST', 'MULTI_LIST', 'GROUP'],
  })
  type: BuilderFieldType;

  @ApiProperty({
    enum: ['AND', 'OR'],
  })
  value: BuilderGroupValues;

  @ApiProperty({
    type: [MessageFilterChild],
  })
  @IsArray()
  children: MessageFilterChild[];
}

export class NotificationChannelDto {
  @ApiPropertyOptional({
    type: MessageTemplateDto,
  })
  @ValidateNested()
  @IsOptional()
  template?: MessageTemplateDto;

  @ApiPropertyOptional({
    type: [MessageFilter],
  })
  @IsArray()
  @ValidateNested()
  @IsOptional()
  filters?: MessageFilter[];

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  active?: boolean;
}

export class CreateNotificationTemplateRequestDto implements ICreateNotificationTemplateDto {
  @ApiProperty()
  @IsString()
  @IsDefined()
  name: string;

  @ApiProperty()
  @IsString()
  @IsDefined({
    message: 'Notification group must be provided',
  })
  notificationGroupId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  tags: string[];

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(100)
  description: string;

  @ApiProperty({
    type: [NotificationChannelDto],
  })
  @IsDefined()
  @IsArray()
  @ValidateNested()
  steps: NotificationChannelDto[];

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  active?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  draft?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  critical?: boolean;

  @ApiPropertyOptional({
    type: PreferenceChannels,
  })
  @IsOptional()
  preferenceSettings?: IPreferenceChannels;
}
