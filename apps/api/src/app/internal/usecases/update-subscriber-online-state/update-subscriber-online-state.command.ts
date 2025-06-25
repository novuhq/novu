import { IsString, IsNotEmpty, IsBoolean, IsOptional, IsMongoId } from 'class-validator';
import { BaseCommand } from '@novu/application-generic';

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
