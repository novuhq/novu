import { BaseCommand, IsValidContextPayload } from '@novu/application-generic';
import { ChannelEndpointByType, ChannelEndpointType, ContextPayload, ENDPOINT_TYPES } from '@novu/shared';
import { IsArray, IsBoolean, IsDefined, IsEnum, IsOptional, IsString } from 'class-validator';
import { EnvironmentCommand } from '../../../shared/commands/project.command';
import { IsValidChannelEndpoint } from '../../validators/channel-endpoint.validator';

// @ts-expect-error - Override with more specific typing for type safety
export class CreateChannelEndpointCommand<
  T extends ChannelEndpointType = ChannelEndpointType,
> extends EnvironmentCommand {
  @IsOptional()
  @IsString()
  identifier?: string;

  @IsDefined()
  @IsString()
  integrationIdentifier: string;

  @IsOptional()
  @IsString()
  connectionIdentifier?: string;

  @IsDefined()
  @IsString()
  subscriberId: string;

  @IsOptional()
  @IsValidContextPayload({ maxCount: 5 })
  context?: ContextPayload;

  /**
   * Pre-resolved context keys. When provided they are persisted verbatim and the
   * `context` payload is ignored — used by the OAuth callback to carry a
   * session-validated context without re-resolving (and re-trusting) a payload.
   */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  contextKeys?: string[];

  @IsDefined()
  @IsEnum(Object.values(ENDPOINT_TYPES))
  type: T;

  @IsDefined()
  @IsValidChannelEndpoint()
  endpoint: ChannelEndpointByType[T];

  /**
   * Trust marker: `true` only when the caller has verified that the
   * `(platform, platformUserId)` in `endpoint` genuinely belongs to the linking
   * user — e.g. resolved from a signed OAuth token exchange, a verified provider
   * deep-link, or an authenticated inbound webhook. It gates the real-time
   * confirmation of a subscriber's pending auth CTA cards, which is a
   * security-sensitive action that must never fire on a user-supplied identity.
   *
   * Left unset by the public channel-endpoint API (`POST /v1/channel-endpoints`)
   * and any other caller that accepts an arbitrary `endpoint` payload, so a
   * client cannot force-confirm another user's auth gate by claiming their id.
   */
  @IsOptional()
  @IsBoolean()
  platformIdentityVerified?: boolean;

  static create<T extends ChannelEndpointType>(data: {
    organizationId: string;
    environmentId: string;
    identifier?: string;
    integrationIdentifier: string;
    connectionIdentifier?: string;
    subscriberId: string;
    context?: ContextPayload;
    contextKeys?: string[];
    type: T;
    endpoint: ChannelEndpointByType[T];
    platformIdentityVerified?: boolean;
  }): CreateChannelEndpointCommand<T> {
    // Call BaseCommand.create with the correct constructor to ensure full inheritance chain validation
    // biome-ignore lint/complexity/noThisInStatic: Required to maintain proper this context for validation
    return BaseCommand.create.call(this, data);
  }
}
