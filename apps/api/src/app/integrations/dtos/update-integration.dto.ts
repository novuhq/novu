import { ApiPropertyOptional } from '@nestjs/swagger';
import { CredentialsDto, StepFilterDto } from '@novu/application-generic';
import { IUpdateIntegrationBodyDto } from '@novu/shared';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsMongoId,
  IsObject,
  IsOptional,
  IsString,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

export class UpdateIntegrationRequestDto implements IUpdateIntegrationBodyDto {
  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  identifier?: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsMongoId()
  _environmentId?: string;

  @ApiPropertyOptional({
    type: Boolean,
    description: 'If the integration is active the validation on the credentials field will run',
  })
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional({
    type: CredentialsDto,
  })
  @IsOptional()
  @Type(() => CredentialsDto)
  @ValidateNested()
  credentials?: CredentialsDto;

  @ApiPropertyOptional({ type: Boolean })
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
