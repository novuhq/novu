import { OrganizationLevelWithUserCommand } from '@novu/application-generic';
import { EnvironmentVariableType } from '@novu/shared';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString, Matches, ValidateNested } from 'class-validator';

export class EnvironmentVariableValueCommand {
  @IsString()
  @IsNotEmpty()
  _environmentId: string;

  @IsString()
  value: string;
}

export class CreateEnvironmentVariableCommand extends OrganizationLevelWithUserCommand {
  @IsString()
  @IsNotEmpty()
  @Matches(/^[A-Za-z][A-Za-z0-9_]*$/)
  key: string;

  @IsEnum(EnvironmentVariableType)
  @IsOptional()
  type?: EnvironmentVariableType;

  @IsBoolean()
  @IsOptional()
  isSecret?: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EnvironmentVariableValueCommand)
  @IsOptional()
  values?: EnvironmentVariableValueCommand[];
}
