import { IsEmail, IsOptional, IsString } from 'class-validator';
import { EnvironmentCommand } from '../../../shared/commands/project.command';
import { IUpdateSubscriberDto } from '@novu/shared';

export class UpdateSubscriberCommand extends EnvironmentCommand implements IUpdateSubscriberDto {
  @IsString()
  subscriberId: string;

  @IsOptional()
  firstName?: string;

  @IsOptional()
  lastName?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsString()
  @IsOptional()
  avatar?: string;
}
