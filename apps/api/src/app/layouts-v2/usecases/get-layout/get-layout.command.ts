import { IsString, IsBoolean, IsOptional } from 'class-validator';
import { EnvironmentCommand } from '@novu/application-generic';

export class GetLayoutCommand extends EnvironmentCommand {
  @IsString()
  @IsOptional()
  layoutIdOrInternalId?: string;

  @IsBoolean()
  @IsOptional()
  skipAdditionalFields?: boolean;

  @IsString()
  @IsOptional()
  userId?: string;
}
