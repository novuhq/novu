import { OrganizationLevelWithUserCommand } from '@novu/application-generic';
import { EnvironmentVariableType } from '@novu/shared';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString, Matches, ValidateNested } from 'class-validator';
import { EnvironmentVariableValueCommand } from '../create-environment-variable/create-environment-variable.command';

export class UpdateEnvironmentVariableCommand extends OrganizationLevelWithUserCommand {
  @IsString()
  @IsNotEmpty()
  variableKey: string;

  @IsString()
  @Matches(/^[A-Za-z][A-Za-z0-9_]*$/)
  @IsOptional()
  key?: string;

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
