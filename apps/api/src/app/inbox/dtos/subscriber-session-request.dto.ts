import { Type } from 'class-transformer';
import { IsDefined, IsOptional, IsString, ValidateNested } from 'class-validator';

export class SubscriberSessionRequestDto {
  @IsString()
  @IsOptional()
  readonly applicationIdentifier?: string;

  @IsString()
  @IsOptional()
  // TODO: Backward compatibility support - remove in future versions (see NV-5801)
  /** @deprecated Use subscriber instead */
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

  @IsOptional()
  @IsString()
  readonly locale?: string;
}
