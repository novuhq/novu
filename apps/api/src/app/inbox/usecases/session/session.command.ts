import { IsDefined, IsOptional, IsString } from 'class-validator';
import { BaseCommand } from '@novu/application-generic';

export class SessionCommand extends BaseCommand {
  @IsDefined()
  @IsString()
  readonly applicationIdentifier: string;

  @IsString()
  @IsOptional()
  readonly subscriberHash?: string;

  @IsDefined()
  @ValidateNested()
  @Type(() => SubscriberCommand)
  readonly subscriber: SubscriberCommand | string;

  @IsOptional()
  @IsString()
  readonly origin?: string;
}

export class SubscriberCommand {
  @IsDefined()
  @IsString()
  readonly subscriberId: string;

  @IsOptional()
  @IsString()
  readonly firstName?: string;

  @IsOptional()
  @IsString()
  readonly lastName?: string;

  @IsOptional()
  @IsString()
  readonly email?: string;

  @IsOptional()
  @IsString()
  readonly timezone?: string;

  @IsOptional()
  readonly data?: Record<string, unknown>;
}
