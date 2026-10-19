import { ApiPropertyOptional } from '@nestjs/swagger';
import { EnvironmentVariableType, IUpdateEnvironmentVariableDto } from '@novu/shared';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsEnum, IsOptional, IsString, Matches, MaxLength, ValidateNested } from 'class-validator';
import { EnvironmentVariableValueDto } from './create-environment-variable-request.dto';

export class UpdateEnvironmentVariableRequestDto implements IUpdateEnvironmentVariableDto {
  @ApiPropertyOptional({
    description:
      'Unique key for the variable. Must start with a letter and contain only letters, digits, and underscores.',
  })
  @IsString()
  @MaxLength(256)
  @Matches(/^[A-Za-z][A-Za-z0-9_]*$/, {
    message: 'Key must start with a letter and contain only letters, digits, and underscores',
  })
  @IsOptional()
  key?: string;

  @ApiPropertyOptional({ enum: EnvironmentVariableType, description: 'The type of the variable' })
  @IsEnum(EnvironmentVariableType)
  @IsOptional()
  type?: EnvironmentVariableType;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isSecret?: boolean;

  @ApiPropertyOptional({ type: [EnvironmentVariableValueDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EnvironmentVariableValueDto)
  @IsOptional()
  values?: EnvironmentVariableValueDto[];
}
