export interface ICredentials {
  apiKey?: string;
  user?: string;
  secretKey?: string;
  domain?: string;
  password?: string;
  host?: string;
  port?: string;
  secure?: boolean;
  region?: string;
  accountSid?: string;
  messageProfileId?: string;
  token?: string;
  from?: string;
  senderName?: string;
  contentType?: string;
  applicationId?: string;
  clientId?: string;
  projectName?: string;
  serviceAccount?: string;
  baseUrl?: string;
  webhookUrl?: string;
  requireTls?: boolean;
  ignoreTls?: boolean;
  tlsOptions?: Record<string, unknown>;
  redirectUrl?: string;
  hmac?: boolean;
  ipPoolName?: string;
  apiKeyRequestHeader?: string;
  secretKeyRequestHeader?: string;
  idPath?: string;
  datePath?: string;
  authenticateByToken?: boolean;
  authenticationTokenKey?: string;
  accessKey?: string;
  instanceId?: string;
  apiToken?: string;
  apiURL?: string;
  appID?: string;
  alertUid?: string;
  title?: string;
  imageUrl?: string;
  state?: string;
  externalLink?: string;
  phoneNumberIdentification?: string;
  businessAccountId?: string;
  channelId?: string;
  apiVersion?: string;
  appSid?: string;
  senderId?: string;
  AppIOBaseUrl?: string;
  AppIOSubscriptionId?: string;
  AppIOBearerToken?: string;
  AppIOOriginalSignature?: string;
  servicePlanId?: string;
  tenantId?: string;
  signingSecret?: string;
  outboundIntegrationId?: string;
  useFromAddressOverride?: boolean;
  fromAddressOverride?: string;
  /** Claude Managed Agents: ID of the Anthropic environment tied to this integration. */
  externalEnvironmentId?: string;
  /**
   * Claude Managed Agents: id of the Anthropic workspace used in console deep links.
   *
   * Defaults to `"default"` (every org's auto-created Default Workspace, which has no real id).
   * For custom workspaces, set this to the workspace identifier (e.g. `wrkspc_01JwQvzr7rXLA5AGx3HKfFUJ`).
   * The Anthropic public SDK does not expose workspaces, so we cannot auto-detect this — it has to be
   * configured per-integration when the customer is not on the default workspace.
   */
  externalWorkspaceId?: string;
}
