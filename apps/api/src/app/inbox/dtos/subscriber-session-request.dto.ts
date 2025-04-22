import { IsDefined, IsOptional, IsString } from 'class-validator';

export class SubscriberSessionRequestDto {
  @IsString()
  @IsDefined()
  readonly applicationIdentifier: string;

  @IsString()
  @IsDefined()
  readonly subscriberId: string;

  @IsString()
  @IsOptional()
  readonly subscriberHash?: string;

  @IsOptional()
  readonly subscriber?: Subscriber | string;
  // todo create subscriber dto
}
