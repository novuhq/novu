import { ApiPropertyOptional } from '@nestjs/swagger';
import { ApiContextPayload, IsValidContextPayload } from '@novu/application-generic';
import { ContextPayload } from '@novu/shared';
import { Type } from 'class-transformer';
import { ArrayUnique, IsArray, IsEnum, IsInt, IsOptional, Max, Min, ValidateNested } from 'class-validator';
import { BaseSubscriberFieldsDto } from '../../shared/dtos/base-subscriber-fields.dto';
import { SubscriberTokenScopeEnum, TOKEN_KINDS } from '../../shared/services/novu-tokens.service';

const MAX_EXPIRES_IN_SECONDS = TOKEN_KINDS.subscriberLogin.maxLifetimeSeconds;

export class CreateSubscriberTokenRequestDto {
  @ApiContextPayload()
  @IsOptional()
  @IsValidContextPayload({ maxCount: 5 })
  context?: ContextPayload;

  @ApiPropertyOptional({
    type: BaseSubscriberFieldsDto,
    description:
      'Profile fields saved on the subscriber when the token is exchanged for an Inbox session. The subscriberId comes from the path.',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => BaseSubscriberFieldsDto)
  subscriber?: BaseSubscriberFieldsDto;

  @ApiPropertyOptional({
    enum: SubscriberTokenScopeEnum,
    enumName: 'SubscriberTokenScopeEnum',
    isArray: true,
    description: 'Extra permissions granted to the session the token is exchanged for. Defaults to none.',
    example: [SubscriberTokenScopeEnum.CHANNELS_SHARED],
  })
  @IsOptional()
  @IsArray()
  @IsEnum(SubscriberTokenScopeEnum, { each: true })
  @ArrayUnique()
  scope?: SubscriberTokenScopeEnum[];

  @ApiPropertyOptional({
    type: 'integer',
    minimum: 1,
    maximum: MAX_EXPIRES_IN_SECONDS,
    default: MAX_EXPIRES_IN_SECONDS,
    description: `Token lifetime in seconds, from 1 to ${MAX_EXPIRES_IN_SECONDS}.`,
    example: 600,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(MAX_EXPIRES_IN_SECONDS)
  expiresIn?: number;
}
