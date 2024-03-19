import { IsEnum, IsOptional, IsString } from 'class-validator';
import { JobTitleEnum } from '@novu/shared';
import { AuthenticatedCommand } from '../../../shared/commands/authenticated.command';

export class UpdateProfileCommand extends AuthenticatedCommand {
  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsEnum(JobTitleEnum)
  jobTitle?: JobTitleEnum;
}
