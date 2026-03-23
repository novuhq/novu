import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EnvironmentVariableType, ICreateEnvironmentVariableDto, IEnvironmentVariableValueDto } from '@novu/shared';
import { Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class EnvironmentVariableValueDto implements IEnvironmentVariableValueDto {
  @ApiProperty()
  @IsString()
  _environmentId: string;

  @ApiProperty()
  @IsString()
  @MaxLength(256)
  value: string;
}

export class CreateEnvironmentVariableRequestDto implements ICreateEnvironmentVariableDto {
  @ApiProperty({
    description:
      'Unique key for the variable. Must start with a letter and contain only letters, digits, and underscores.',
  })
  @IsString()
  @MaxLength(256)
  @Matches(/^[A-Za-z][A-Za-z0-9_]*$/, {
    message: 'Key must start with a letter and contain only letters, digits, and underscores',
  })
  key: string;

  @ApiPropertyOptional({ enum: EnvironmentVariableType, description: 'The type of the variable' })
  @IsEnum(EnvironmentVariableType)
  @IsOptional()
  type?: EnvironmentVariableType;

  @ApiPropertyOptional({ description: 'Whether this variable is a secret (encrypted at rest, masked in responses)' })
  @IsBoolean()
  @IsOptional()
  isSecret?: boolean;

  @ApiPropertyOptional({ type: [EnvironmentVariableValueDto] })
  @IsArray()
  @ArrayUnique((v: EnvironmentVariableValueDto) => v._environmentId, { message: 'Duplicate _environmentId in values' })
  @ValidateNested({ each: true })
  @Type(() => EnvironmentVariableValueDto)
  @IsOptional()
  values?: EnvironmentVariableValueDto[];
}
