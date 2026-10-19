import { ChannelTypeEnum } from './channel';
import { EnvironmentId } from './environment';
import { OrganizationId } from './organization';
import { ProvidersIdEnum } from './providers';

export type ConnectionMode = 'subscriber' | 'shared';

export type ChannelConnection = {
  _id: string;
  identifier: string;

  _organizationId: OrganizationId;
  _environmentId: EnvironmentId;

  integrationIdentifier: string;
  providerId: ProvidersIdEnum;
  channel: ChannelTypeEnum;
  subscriberId?: string;
  contextKeys: string[];

  /**
   * Platform workspace this connection was installed into.
   *
   * `botUserId` is the platform user id of the bot within this workspace (e.g. Slack `U…`), captured
   * at OAuth install time (or lazily backfilled via `auth.test`). It's required for channel-mention
   * detection in multi-workspace mode, where no default bot token is baked into the adapter and the
   * bot's own identity can't otherwise be resolved from an inbound event.
   */
  workspace: { id: string; name?: string; botUserId?: string };
  /**
   * Provider OAuth/bot credentials persisted alongside the connection.
   *
   * `accessToken` is the provider bearer token used to call Slack / MS Teams / etc.;
   * additional secret fields (`refreshToken`, `signingSecret`, `clientSecret`) are
   * encrypted at rest by the same prefix-based helper when present. Values stored
   * on disk are typically prefixed with `nvsk.` once they pass through the write
   * path — decrypt with `decryptChannelConnectionAuth` at use-time.
   */
  auth: {
    accessToken: string;
    refreshToken?: string;
    expiresAt?: string;
    refreshTokenExpiresAt?: string;
    signingSecret?: string;
    clientSecret?: string;
  };

  createdAt: string;
  updatedAt: string;
};
