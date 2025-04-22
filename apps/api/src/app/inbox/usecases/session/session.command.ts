import { IsDefined, IsOptional, IsString, ValidateNested } from 'class-validator';
import { BaseCommand } from '@novu/application-generic';
import { Type } from 'class-transformer';

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
  readonly subscriber: SubscriberCommand;

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
  readonly phone?: string;

  @IsOptional()
  @IsString()
  readonly avatar?: string;

  @IsOptional()
  readonly data?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  readonly timezone?: string;
}
