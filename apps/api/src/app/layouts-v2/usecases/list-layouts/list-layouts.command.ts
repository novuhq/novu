import { IsNumber, IsOptional, IsString, IsEnum } from 'class-validator';
import { EnvironmentWithUserObjectCommand } from '@novu/application-generic';
import { DirectionEnum } from '@novu/shared';

export class ListLayoutsCommand extends EnvironmentWithUserObjectCommand {
  @IsNumber()
  @IsOptional()
  offset?: number;

  @IsNumber()
  @IsOptional()
  limit?: number;

  @IsEnum(DirectionEnum)
  @IsOptional()
  orderDirection?: DirectionEnum;

  @IsString()
  @IsOptional()
  orderBy?: string;

  @IsString()
  @IsOptional()
  searchQuery?: string;
}
