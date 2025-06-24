import { IsString, IsNotEmpty, IsBoolean, IsOptional } from 'class-validator';
import { BaseCommand } from '@novu/application-generic';

export class UpdateSubscriberOnlineStateCommand extends BaseCommand {
  @IsString()
  @IsNotEmpty()
  subscriberId: string;

  @IsString()
  @IsNotEmpty()
  environmentId: string;

  @IsBoolean()
  isOnline: boolean;

  @IsOptional()
  timestamp?: number;
}
