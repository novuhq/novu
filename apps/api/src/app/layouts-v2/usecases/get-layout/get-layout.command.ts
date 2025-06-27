import { IsString, IsBoolean, IsOptional } from 'class-validator';
import { EnvironmentWithUserCommand } from '@novu/application-generic';

export class GetLayoutCommand extends EnvironmentWithUserCommand {
  @IsString()
  @IsOptional()
  layoutIdOrInternalId?: string;

  @IsBoolean()
  @IsOptional()
  skipAdditionalFields?: boolean;
}
