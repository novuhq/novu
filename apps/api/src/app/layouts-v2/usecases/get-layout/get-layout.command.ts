import { EnvironmentCommand } from '@novu/application-generic';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

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
