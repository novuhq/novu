import { BaseCommand } from '@novu/application-generic';
import { IsBoolean, IsMongoId, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateSubscriberOnlineStateCommand extends BaseCommand {
  @IsString()
  @IsNotEmpty()
  subscriberId: string;

  @IsString()
  @IsNotEmpty()
  @IsMongoId()
  environmentId: string;

  @IsBoolean()
  isOnline: boolean;

  @IsOptional()
  timestamp?: number;
}
