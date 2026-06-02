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
  /**
   * Agent default shared inbox: the slug prefix used in
   * `{emailSlugPrefix}-{inboxRoutingKey}@<shared-domain>`. Only meaningful on
   * the NovuAgent email integration. Snapshotted from the linked agent's
   * identifier at provisioning time; editable by the user. Validated against
   * `^[a-z0-9](?:[a-z0-9-]{0,30}[a-z0-9])?$` server-side.
   */
  emailSlugPrefix?: string;
  /**
   * Agent default shared inbox: the trailing routing key in
   * `{emailSlugPrefix}-{inboxRoutingKey}@<shared-domain>`. Only meaningful on
   * the NovuAgent email integration. Generated server-side at provisioning
   * time, globally unique under a partial index on `credentials.inboxRoutingKey`
   * scoped to `providerId = novu-email-agent`. Not user-editable: the API
   * update path pins this field to its existing value to prevent rotation
   * through the standard integration update endpoint.
   */
  inboxRoutingKey?: string;
  /**
   * Cloud-only kill switch for the Novu shared inbox
   * (`{emailSlugPrefix}-{inboxRoutingKey}@<shared-domain>`). When `true`, the
   * inbound worker drops mail addressed to this agent on the shared domain;
   * custom-domain routes for the same agent still deliver. Only meaningful on
   * the NovuAgent email integration. Managed server-side via
   * `PATCH /agents/:identifier/inbox/shared`; pinned through the generic
   * integration update path.
   */
  sharedInboxDisabled?: boolean;
  /** Claude Managed Agents: ID of the Anthropic environment tied to this integration. */
  externalEnvironmentId?: string;
  /**
   * Claude Managed Agents: ID of the Anthropic vault (`vlt_…`) tied to this integration.
   *
   * Provisioned eagerly alongside the environment so OAuth-completed MCP credentials
   * can be pushed to Anthropic's per-vault credentials API without any additional lookup.
   */
  externalVaultId?: string;
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
