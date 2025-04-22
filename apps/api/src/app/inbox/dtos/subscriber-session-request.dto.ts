import { IsDefined, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class SubscriberSessionRequestDto {
  @IsString()
  @IsDefined()
  readonly applicationIdentifier: string;

  @IsString()
  @IsOptional()
  readonly subscriberId?: string;

  @IsString()
  @IsOptional()
  readonly subscriberHash?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => SubscriberDto)
  readonly subscriber?: SubscriberDto | string;
}

export class SubscriberDto {
  @IsOptional()
  @IsString()
  readonly id?: string;

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
