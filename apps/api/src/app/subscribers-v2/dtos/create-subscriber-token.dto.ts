import { ApiPropertyOptional } from '@nestjs/swagger';
import { ApiContextPayload, IsValidContextPayload } from '@novu/application-generic';
import { ContextPayload, VALID_ID_REGEX } from '@novu/shared';
import { Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  ValidateBy,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { BaseSubscriberFieldsDto } from '../../shared/dtos/base-subscriber-fields.dto';
import { SubscriberTokenScopeEnum, TOKEN_KINDS } from '../../shared/services/novu-tokens.service';

const LOGIN_MAX_SECONDS = TOKEN_KINDS.subscriberLogin.maxLifetimeSeconds;
const TOPIC_GRANT_MAX_SECONDS = TOKEN_KINDS.subscriberTopicGrant.maxLifetimeSeconds;
const LOGIN_FIELDS = ['scope', 'subscriber', 'context'] as const;

function IsNotCombinedWithLoginFields() {
  return ValidateBy({
    name: 'isNotCombinedWithLoginFields',
    validator: {
      validate: (_value, args) => {
        const request = args?.object as CreateSubscriberTokenRequestDto;

        return LOGIN_FIELDS.every((field) => request[field] === undefined);
      },
      defaultMessage: () => `topic cannot be combined with ${LOGIN_FIELDS.join(', ')}`,
    },
  });
}

function IsWithinTopicGrantLifetime() {
  return ValidateBy({
    name: 'isWithinTopicGrantLifetime',
    validator: {
      validate: (value, args) =>
        (args?.object as CreateSubscriberTokenRequestDto).topic === undefined ||
        (typeof value === 'number' && value <= TOPIC_GRANT_MAX_SECONDS),
      defaultMessage: () => `expiresIn must not be greater than ${TOPIC_GRANT_MAX_SECONDS} for a topic grant`,
    },
  });
}

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
    type: 'string',
    description:
      'Topic key the subscriber may subscribe to. When set, the token is a topic grant instead of a login token: the browser sends it with its subscribe request for this topic, and it lasts at most ' +
      `${TOPIC_GRANT_MAX_SECONDS} seconds. Cannot be combined with ${LOGIN_FIELDS.join(', ')}.`,
    example: 'ticket:12345',
  })
  @ValidateIf((request: CreateSubscriberTokenRequestDto) => request.topic !== undefined)
  @IsString()
  @Matches(VALID_ID_REGEX, {
    message:
      'topic must contain only alphanumeric characters (a-z, A-Z, 0-9), hyphens (-), underscores (_), colons (:), or be a valid email address',
  })
  @IsNotCombinedWithLoginFields()
  topic?: string;

  @ApiPropertyOptional({
    type: 'integer',
    minimum: 1,
    maximum: LOGIN_MAX_SECONDS,
    description: `Token lifetime in seconds, from 1 to ${LOGIN_MAX_SECONDS} for a login token (default ${LOGIN_MAX_SECONDS}), or from 1 to ${TOPIC_GRANT_MAX_SECONDS} for a topic grant (default ${TOPIC_GRANT_MAX_SECONDS}).`,
    example: 600,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(LOGIN_MAX_SECONDS)
  @IsWithinTopicGrantLifetime()
  expiresIn?: number;
}
