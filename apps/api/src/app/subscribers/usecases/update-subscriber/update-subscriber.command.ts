import { IsArray, IsEmail, IsOptional, IsString } from 'class-validator';
import { CommandHelper } from '../../../shared/commands/command.helper';
import { EnvironmentCommand } from '../../../shared/commands/project.command';
import { IUpdateSubscriberDto } from '@novu/shared';

export class UpdateSubscriberCommand extends EnvironmentCommand implements IUpdateSubscriberDto {
  static create(data: UpdateSubscriberCommand) {
    return CommandHelper.create(UpdateSubscriberCommand, data);
  }

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

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  notificationIdentifiers?: string[];
}
