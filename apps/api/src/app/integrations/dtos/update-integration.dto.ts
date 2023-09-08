import { ApiPropertyOptional } from '@nestjs/swagger';
import { IUpdateIntegrationBodyDto } from '@novu/shared';
import { IsArray, IsBoolean, IsMongoId, IsOptional, IsString, ValidateNested } from 'class-validator';
import { CredentialsDto } from './credentials.dto';
import { Type } from 'class-transformer';
import { StepFilter } from '../../shared/dtos/step-filter';

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
    type: [StepFilter],
  })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  conditions?: StepFilter[];
}
