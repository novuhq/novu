import { ApiPropertyOptional } from '@nestjs/swagger';
import { CredentialsDto, StepFilterDto } from '@novu/application-generic';
import { ChannelTypeEnum, ICreateIntegrationBodyDto, IntegrationKindEnum } from '@novu/shared';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDefined,
  IsEnum,
  IsMongoId,
  IsObject,
  IsOptional,
  IsString,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

export class CreateIntegrationRequestDto implements ICreateIntegrationBodyDto {
  @ApiPropertyOptional({ type: String, description: 'The name of the integration' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ type: String, description: 'The unique identifier for the integration' })
  @IsOptional()
  @IsString()
  identifier?: string;

  @ApiPropertyOptional({ type: String, description: 'The ID of the associated environment', format: 'uuid' })
  @IsOptional()
  @IsMongoId()
  _environmentId?: string;

  @ApiPropertyOptional({ type: String, description: 'The provider ID for the integration' })
  @IsDefined()
  @IsString()
  providerId: string;

  @ApiPropertyOptional({
    enum: ChannelTypeEnum,
    description: 'The channel type for the integration. Not required for agent-kind integrations.',
  })
  @IsOptional()
  @IsEnum(ChannelTypeEnum)
  channel?: ChannelTypeEnum;

  @ApiPropertyOptional({
    enum: IntegrationKindEnum,
    description:
      'Distinguishes delivery integrations from agent-runtime integrations. Defaults to "delivery". Agent integrations do not require a channel.',
  })
  @IsOptional()
  @IsEnum(IntegrationKindEnum)
  kind?: IntegrationKindEnum;

  @ApiPropertyOptional({
    type: CredentialsDto,
    description: 'The credentials for the integration',
  })
  @IsOptional()
  @Type(() => CredentialsDto)
  @ValidateNested()
  credentials?: CredentialsDto;

  @ApiPropertyOptional({
    type: Boolean,
    description: 'If the integration is active, the validation on the credentials field will run',
  })
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional({ type: Boolean, description: 'Flag to check the integration status' })
  @IsOptional()
  @IsBoolean()
  check?: boolean;

  @ApiPropertyOptional({
    type: [StepFilterDto],
    deprecated: true,
    description:
      'Legacy StepFilter conditions for the integration. If both `rules` and `conditions` are present, send-time selection evaluates `rules` and ignores `conditions`. Use `rules` instead.',
  })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  conditions?: StepFilterDto[];

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: true,
    nullable: true,
    description:
      'JSONLogic rules used to select this integration at send time. Supports tenant, context, and subscriber fields. When both `rules` and `conditions` are set, `rules` take precedence and `conditions` are ignored.',
    example: {
      '==': [{ var: 'tenant.identifier' }, 'acme'],
    },
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsObject()
  rules?: Record<string, unknown> | null;

  @ApiPropertyOptional({
    type: Object,
    description: 'Configurations for the integration',
  })
  @IsOptional()
  @IsObject()
  configurations?: Record<string, string>;
}
