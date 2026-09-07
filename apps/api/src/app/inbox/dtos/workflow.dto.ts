import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CustomDataType, SeverityLevelEnum } from '@novu/shared';
import { IsArray, IsBoolean, IsDefined, IsEnum, IsObject, IsOptional, IsString } from 'class-validator';

export class WorkflowDto {
  @ApiProperty({
    type: String,
    description: 'Unique identifier of the workflow',
    example: '64a1b2c3d4e5f6g7h8i9j0k1',
  })
  @IsDefined()
  @IsString()
  id: string;

  @ApiProperty({
    type: String,
    description: 'Workflow identifier used for triggering',
    example: 'welcome-email',
  })
  @IsDefined()
  @IsString()
  identifier: string;

  @ApiProperty({
    type: String,
    description: 'Human-readable name of the workflow',
    example: 'Welcome Email Workflow',
  })
  @IsDefined()
  @IsString()
  name: string;

  @ApiProperty({
    type: Boolean,
    description: 'Whether this workflow is marked as critical',
    example: false,
  })
  @IsDefined()
  @IsBoolean()
  critical: boolean;

  @ApiPropertyOptional({
    type: [String],
    description: 'Tags associated with the workflow',
    example: ['user-onboarding', 'email'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({
    type: Object,
    description: 'Custom data associated with the workflow',
    example: { category: 'onboarding', priority: 'high' },
  })
  @IsOptional()
  @IsObject()
  data?: CustomDataType;

  @ApiProperty({
    enum: SeverityLevelEnum,
    enumName: 'SeverityLevelEnum',
    description: 'Severity level of the workflow',
  })
  @IsDefined()
  @IsEnum(SeverityLevelEnum)
  severity: SeverityLevelEnum;
}
