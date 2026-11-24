import { createAppEnv, type EnvVarDefinition } from '@novu/application-generic';

/**
 * Variables only the api uses, added to the shared ones in libs/application-generic/src/config/env.schema.ts.
 * Together the two files list every variable the api uses, and apps/api/ENVIRONMENT.md is generated from them.
 * Read both with `env.X` from this file; entries with `readBy` are read by those dependencies instead and have
 * no `env.X`. Their `boot` rules for `api` decide what `validateEnv` checks.
 *
 * Also read by a computed name, so not listed: API_RATE_LIMIT_{ALGORITHM,COST,MAXIMUM}_*, typed by the
 * ApiRateLimit*EnvVarFormat types in @novu/shared.
 */
export const appEnvSchema = {
  AGENT_ACTION_TOKEN_TTL: {
    description:
      'Lifetime in seconds of agent conversation action tokens. Unset or not a positive integer uses the built-in TTL.',
  },
  AGENT_API_HOSTNAME: {
    description:
      'Public api URL for agent and chat-app webhooks and OAuth callbacks when it differs from API_ROOT_URL, such as a local tunnel. Falls back to API_ROOT_URL.',
  },
  AGENT_EMAIL_ACTION_TOKEN_TTL: {
    description:
      'Lifetime in seconds of action tokens in agent emails. Unset or not a positive integer uses the built-in TTL.',
  },
  AGENT_INBOX_DASHBOARD_API_SECRET: {
    description:
      'Secret the Agent Inbox dashboard sends to the human dashboard endpoints. Unset turns those endpoints off.',
  },
  AI_BEDROCK_GUARDRAIL_ID: {
    readBy: ['@novu/ee-ai'],
    description:
      'Bedrock Guardrail the Copilot runs through. The Copilot uses Bedrock only when all four AI_BEDROCK_* are set.',
  },
  AI_BEDROCK_GUARDRAIL_VERSION: {
    readBy: ['@novu/ee-ai'],
    description: 'Version of AI_BEDROCK_GUARDRAIL_ID.',
  },
  AI_BEDROCK_MODEL: {
    readBy: ['@novu/ee-ai'],
    description: 'Bedrock Claude model for the Copilot. A non-Claude model keeps the Copilot off Bedrock.',
  },
  AI_BEDROCK_REGION: {
    readBy: ['@novu/ee-ai'],
    description: 'AWS region of the Bedrock model and guardrail.',
  },
  AI_LLM_API_KEY: {
    readBy: ['@novu/ee-ai'],
    description: 'API key of AI_LLM_PROVIDER for the Copilot and other AI features.',
  },
  AI_LLM_MAX_OUTPUT_TOKENS: {
    readBy: ['@novu/ee-ai'],
    format: 'number',
    boot: { api: { when: 'novu-cloud' } },
    description: 'Maximum output tokens per LLM call. Unset uses 8192.',
  },
  AI_LLM_MAX_RETRIES: {
    readBy: ['@novu/ee-ai'],
    format: 'number',
    boot: { api: { when: 'novu-cloud' } },
    description: 'Retries per LLM call. Unset uses 3.',
  },
  AI_LLM_MODEL: {
    readBy: ['@novu/ee-ai'],
    description: 'LLM model id. Unset uses the default model of AI_LLM_PROVIDER.',
  },
  AI_LLM_PROMPT_CACHE_RETENTION: {
    readBy: ['@novu/ee-ai'],
    choices: ['in-memory', '24h'],
    boot: { api: { when: 'novu-cloud' } },
    description: 'OpenAI prompt cache retention. Unset uses 24h.',
  },
  AI_LLM_PROVIDER: {
    readBy: ['@novu/ee-ai'],
    choices: ['openai', 'anthropic'],
    boot: { api: { when: 'novu-cloud' } },
    description: 'LLM provider: anthropic, or OpenAI otherwise.',
  },
  AI_LLM_REASONING_EFFORT: {
    readBy: ['@novu/ee-ai'],
    choices: ['none', 'minimal', 'low', 'medium', 'high', 'xhigh'],
    boot: { api: { when: 'novu-cloud' } },
    description: 'Reasoning effort for reasoning models. Unset leaves it to the provider.',
  },
  AI_LLM_SERVICE_TIER: {
    readBy: ['@novu/ee-ai'],
    choices: ['auto', 'default', 'flex', 'priority'],
    boot: { api: { when: 'novu-cloud' } },
    description: 'OpenAI service tier. Unset uses priority.',
  },
  AI_LLM_SIDE_CALL_MODEL: {
    readBy: ['@novu/ee-ai'],
    description: 'Model for small side calls, such as titles and summaries. Unset uses gpt-4o.',
  },
  AI_LLM_TEMPERATURE: {
    readBy: ['@novu/ee-ai'],
    format: 'number',
    boot: { api: { when: 'novu-cloud' } },
    description: 'Sampling temperature for non-reasoning models. Unset uses 0.',
  },
  BETTER_AUTH_BASE_URL: {
    readBy: ['@novu/ee-auth'],
    description:
      'Public URL of the Better Auth routes on self-hosted enterprise, also the default SAML entity ID. Unset uses http://localhost:3000/v1/better-auth.',
  },
  BETTER_AUTH_ORGANIZATION_LIMIT: {
    readBy: ['@novu/ee-auth'],
    description: 'Organizations one Better Auth user can create. Unset or invalid uses 10.',
  },
  BETTER_AUTH_REQUIRE_EMAIL_VERIFICATION: {
    readBy: ['@novu/ee-auth'],
    description: 'Requires a verified email to sign in with a password, unless "false".',
  },
  BETTER_AUTH_SECRET: {
    readBy: ['@novu/ee-auth'],
    description: 'Secret that signs Better Auth sessions. Unset uses JWT_SECRET.',
  },
  CLERK_ISSUER_URL: {
    description: 'Clerk issuer URL, advertised as the authorization server in the OAuth protected-resource metadata.',
  },
  CLERK_MOCK_JWT_PUBLIC_KEY: {
    readBy: ['@novu/ee-auth'],
    description: 'Public key that verifies mock Clerk JWTs in tests when CLERK_ISSUER_URL is unset.',
  },
  CLERK_PUBLISHABLE_KEY: {
    readBy: ['@novu/ee-auth'],
    description: 'Clerk publishable key, used with CLERK_SECRET_KEY to verify Clerk OAuth access tokens.',
  },
  CLERK_SECRET_KEY: {
    readBy: ['@novu/ee-auth'],
    description: 'Clerk secret key for Novu Cloud sign-in and Clerk OAuth access tokens.',
  },
  CLERK_WEBHOOK_SECRET: {
    readBy: ['@novu/ee-auth'],
    description: 'Secret that verifies Clerk webhooks. Clerk webhook requests fail while it is unset.',
  },
  CLIENT_IP_HEADER: {
    description:
      'Single-IP header set by the edge proxy. When it applies, only that header is trusted for the client IP. Unset defaults to cf-connecting-ip on Novu Cloud and trusts the first proxy header elsewhere; empty turns the Cloud default off.',
  },
  CONTEXT_DEV_API_KEY: {
    description:
      'context.dev API key for enriching new organizations with brand details. Unset turns brand enrichment off.',
  },
  DISABLE_EMAIL_PASSWORD_AUTH: {
    readBy: ['@novu/ee-auth'],
    description: '"true" turns email and password sign-in off, but only while an SSO provider is configured.',
  },
  DISABLE_USER_REGISTRATION: {
    type: 'boolean',
    boot: { api: 'checked' },
    description: 'Rejects new account sign-ups.',
  },
  DOCS_BASE_URL: {
    description: 'Docs site origin allowed by CORS.',
  },
  DOMAIN_CONNECT_PRIVATE_KEY: {
    description: 'Private key that signs Domain Connect requests, which set up DNS records for custom domains.',
  },
  EE_AUTH_PROVIDER: {
    readBy: ['@novu/shared'],
    description:
      'Enterprise auth provider: clerk (default, Novu Cloud) or better-auth (self-hosted). Read through getEEAuthProvider in @novu/shared.',
  },
  GITHUB_API_TOKEN: {
    description:
      'GitHub token for fetching agent skill bundles, for a higher rate limit. Unset sends unauthenticated requests.',
  },
  GITHUB_OAUTH_CLIENT_ID: {
    description:
      'GitHub OAuth app client id for GitHub sign-in in the community edition. Unset turns GitHub sign-in off.',
  },
  GITHUB_OAUTH_CLIENT_SECRET: {
    description: 'GitHub OAuth app client secret for GitHub sign-in in the community edition.',
  },
  HUMAN_DASHBOARD_URL: {
    description:
      'Agent Inbox dashboard URL used in human interaction links. Features that link there stay off while it is unset.',
  },
  HUMAN_PENDING_CAP: {
    description:
      'Pending human interactions a subscriber can have at once. Unset or not a positive number uses the built-in cap.',
  },
  INSTANCE_ADMIN_EMAILS: {
    readBy: ['@novu/ee-auth'],
    description: 'Comma-separated emails of the instance admins on self-hosted enterprise. They need a verified email.',
  },
  KEYLESS_DEMO_REPLY_CAP: {
    description:
      'Agent replies in a keyless demo conversation. Unset or not a non-negative integer uses the built-in cap.',
  },
  KEYLESS_ENV_CREATE_CAP_PER_IP_PER_DAY: {
    format: 'number',
    boot: { api: { when: 'novu-cloud' } },
    description:
      'Keyless environments one IP can create per day. Unset or not a non-negative integer uses the built-in cap.',
  },
  KEYLESS_GENERATE_CAP_PER_IP_PER_DAY: {
    format: 'number',
    boot: { api: { when: 'novu-cloud' } },
    description:
      'Keyless generate requests one IP can make per day. Unset or not a non-negative integer uses the built-in cap.',
  },
  KEYLESS_HUMAN_INTERACTION_CAP: {
    description:
      'Human interactions a keyless environment can create before delivery is replaced by the sign-up prompt. Unset or not a non-negative integer uses the built-in cap.',
  },
  KEYLESS_MAX_AGENTS_PER_ENV: {
    format: 'number',
    boot: { api: { when: 'novu-cloud' } },
    description: 'Agents a keyless environment can create. Unset or not a non-negative integer uses the built-in cap.',
  },
  KEYLESS_ORGANIZATION_ID: {
    description: 'Organization that owns keyless environments.',
  },
  KEYLESS_RETENTION_TIME_IN_HOURS: {
    description:
      'Hours before a keyless environment expires. Unset or not a non-negative integer uses the built-in retention.',
  },
  KEYLESS_USER_EMAIL: {
    description: 'Email of the user that owns keyless environments. Keyless Connect fails while it is unset.',
  },
  LANGCHAIN_TRACING_V2: {
    readBy: ['LangSmith SDK'],
    description: 'Older name of LANGSMITH_TRACING.',
  },
  LANGSMITH_API_KEY: {
    readBy: ['LangSmith SDK'],
    description: 'LangSmith API key for tracing the Copilot (@novu/ee-ai).',
  },
  LANGSMITH_ENDPOINT: {
    readBy: ['LangSmith SDK'],
    description: 'LangSmith API endpoint.',
  },
  LANGSMITH_PROJECT: {
    readBy: ['LangSmith SDK'],
    description: 'LangSmith project that receives the traces.',
  },
  LANGSMITH_TRACING: {
    readBy: ['LangSmith SDK'],
    description: '"true" sends LangChain traces to LangSmith.',
  },
  MAIL_SERVER_DOMAIN: {
    description: 'Inbound mail server host, shown as the MX target in the DNS records for custom domains.',
  },
  NOVU_API_KEY: {
    description:
      'Novu Cloud secret key the api uses to send its own emails, such as invites and password resets, in dev and production.',
  },
  NOVU_API_URL: {
    readBy: ['@novu/framework'],
    description:
      "Novu API the framework Client calls back for the api's own bridge: Novu's agents and internal workflows. Unset uses https://api.novu.co, so local setups point it at the local api.",
  },
  NOVU_API_VERSION: {
    default: 'dev',
    description: 'Software version sent when registering MCP OAuth clients.',
  },
  NOVU_AZURE_CLIENT_ID: {
    description: "Client id of Novu's Azure app for the guided Microsoft Teams setup.",
  },
  NOVU_AZURE_CLIENT_SECRET: {
    description: "Client secret of Novu's Azure app for the guided Microsoft Teams setup.",
  },
  NOVU_DASHBOARD_URL: {
    readBy: ['@novu/ee-agents'],
    description:
      'Dashboard URL in Copilot links when FRONT_BASE_URL is unset. Unset too uses https://dashboard.novu.co.',
  },
  NOVU_GITHUB_MCP_APP_CLIENT_ID: {
    description:
      "Client id of Novu's GitHub OAuth app for GitHub MCP connections. Unset reports the credentials as missing.",
  },
  NOVU_GITHUB_MCP_APP_CLIENT_SECRET: {
    description:
      "Client secret of Novu's GitHub OAuth app for GitHub MCP connections. Unset reports the credentials as missing.",
  },
  NOVU_INSTANCE_ADMIN_API_KEY: {
    readBy: ['@novu/ee-auth'],
    description:
      'Comma-separated keys, at least 32 characters, for the instance admin API (AdminKey scheme) on self-hosted enterprise. Two keys allow rotation.',
  },
  NOVU_INTERNAL_AUTH_SECRET: {
    readBy: ['@novu/ee-auth', '@novu/ee-ai'],
    description:
      'Secret of the Internal auth scheme, which the Copilot uses to call the api with internal tokens. Unset turns the scheme off.',
  },
  NOVU_LLM_GATEWAY_ALLOWED_MODELS: {
    readBy: ['@novu/ee-ai'],
    description: 'Comma-separated models the Novu LLM Gateway accepts.',
  },
  NOVU_LLM_GATEWAY_ANTHROPIC_API_KEY: {
    readBy: ['@novu/ee-ai'],
    description: 'Anthropic API key behind the Novu LLM Gateway. Unset makes the gateway answer 500.',
  },
  NOVU_LLM_GATEWAY_DAILY_TOKEN_LIMIT: {
    readBy: ['@novu/ee-ai'],
    description:
      'Tokens an organization can use through the Novu LLM Gateway per day. Unset or invalid uses the built-in limit.',
  },
  NOVU_LLM_GATEWAY_DEFAULT_MODEL: {
    readBy: ['@novu/ee-ai'],
    description: 'Model the Novu LLM Gateway uses when a request names none. Unset uses the built-in model.',
  },
  NOVU_MSTEAMS_PUBLISHER_NAME: {
    default: 'Novu',
    description: 'Publisher name in the generated Microsoft Teams app manifest.',
  },
  NOVU_MSTEAMS_PUBLISHER_PRIVACY_URL: {
    default: 'https://novu.co/privacy',
    description: 'Privacy policy URL in the generated Microsoft Teams app manifest.',
  },
  NOVU_MSTEAMS_PUBLISHER_TERMS_URL: {
    default: 'https://novu.co/terms',
    description: 'Terms of use URL in the generated Microsoft Teams app manifest.',
  },
  NOVU_MSTEAMS_PUBLISHER_WEBSITE_URL: {
    default: 'https://novu.co',
    description: 'Publisher website URL in the generated Microsoft Teams app manifest.',
  },
  NOVU_SECRET_API_KEY: {
    description: 'Novu secret key for the Copilot bridge and the Novu context endpoint. Unset turns both off.',
  },
  NOVU_SECRET_KEY: {
    readBy: ['@novu/framework'],
    description:
      "Secret key the framework Client falls back to when the api's bridge Client gets none, such as NOVU_INTERNAL_SECRET_KEY unset. NOVU_API_KEY is the next fallback.",
  },
  NOVU_STRICT_AUTHENTICATION_ENABLED: {
    type: 'boolean',
    description: 'Turns on strict authentication for the internal Novu bridge. Always on in dev and production.',
  },
  NOVU_TEMPLATEID_INVITE_ACCEPTED: {
    default: 'invite-accepted-dEQAsKD1E',
    description: 'Workflow triggered when an organization invite is accepted.',
  },
  NOVU_TEMPLATEID_INVITE_TO_ORGANISATION: {
    default: 'invite-to-organization-wBnO8NpDn',
    description: 'Workflow triggered to invite a member to an organization.',
  },
  NOVU_TOKEN_SIGNING_KEYS: {
    description:
      'Comma- or space-separated private keys for Novu tokens. The first signs, all verify. Unset derives a key from JWT_SECRET.',
  },
  NOVU_WHATSAPP_APP_ID: {
    description: "App id of Novu's Meta app for the guided WhatsApp setup.",
  },
  NOVU_WHATSAPP_APP_SECRET: {
    description: "App secret of Novu's Meta app for the guided WhatsApp setup.",
  },
  NOVU_WHATSAPP_CONFIG_ID: {
    description: 'Meta embedded signup configuration id for the guided WhatsApp setup.',
  },
  ORGANIZATION_CREATION_POLICY: {
    readBy: ['@novu/ee-auth'],
    description: 'Who can create organizations on self-hosted enterprise: everyone (default), admins or disabled.',
  },
  PHOTON_CONNECT_ENABLED: {
    type: 'boolean',
    default: true,
    description: 'Photon iMessage connect flow. On unless set to "false".',
  },
  PHOTON_DASHBOARD_API_URL: {
    default: 'https://app.photon.codes',
    description: 'Photon dashboard API URL.',
  },
  PHOTON_DEVICE_CLIENT_ID: {
    default: 'photon-cli',
    description:
      'Photon device authorization client id. Device client ids are public (compiled into the Photon CLI) and allow-listed by Photon; switch to a dedicated Novu id once Photon issues one.',
  },
  PHOTON_SPECTRUM_URL: {
    default: 'https://spectrum.photon.codes',
    description: 'Photon Spectrum API URL for webhook configuration.',
  },
  PLAIN_CARDS_HMAC_SECRET_KEY: {
    description: 'HMAC secret that verifies Plain customer card requests.',
  },
  PLAIN_IDENTITY_VERIFICATION_SECRET_KEY: {
    readBy: ['@novu/ee-auth'],
    description: 'HMAC secret that signs the user hash for Plain support chat identity verification.',
  },
  PORTLESS_NGROK_URL: {
    description:
      'Public tunnel URL that portless sets in local development when PORTLESS_NGROK=1. Copied to AGENT_API_HOSTNAME while that is unset.',
  },
  SLACK_API_URL: {
    description: 'Slack Web API URL override, used to point agents at a Slack emulator in tests.',
  },
  SSO_OIDC_AUTHORIZATION_ENDPOINT: {
    readBy: ['@novu/ee-auth'],
    description: 'OIDC authorization endpoint, when discovery does not provide it.',
  },
  SSO_OIDC_CLIENT_ID: {
    readBy: ['@novu/ee-auth'],
    description: 'OIDC client id.',
  },
  SSO_OIDC_CLIENT_SECRET: {
    readBy: ['@novu/ee-auth'],
    description: 'OIDC client secret.',
  },
  SSO_OIDC_DISCOVERY_ENDPOINT: {
    readBy: ['@novu/ee-auth'],
    description: 'OIDC discovery URL. Unset derives it from SSO_OIDC_ISSUER.',
  },
  SSO_OIDC_DOMAIN: {
    readBy: ['@novu/ee-auth'],
    description: 'Email domain that signs in through OIDC.',
  },
  SSO_OIDC_ENABLED: {
    readBy: ['@novu/ee-auth'],
    description: '"true" turns on OIDC sign-in on self-hosted enterprise, together with SSO_OIDC_ISSUER.',
  },
  SSO_OIDC_ISSUER: {
    readBy: ['@novu/ee-auth'],
    description: 'OIDC issuer URL. Its origin is also a trusted origin for Better Auth.',
  },
  SSO_OIDC_JWKS_ENDPOINT: {
    readBy: ['@novu/ee-auth'],
    description: 'OIDC JWKS endpoint, when discovery does not provide it.',
  },
  SSO_OIDC_PROVIDER_ID: {
    readBy: ['@novu/ee-auth'],
    description: 'Better Auth provider id for OIDC. Unset uses enterprise-sso-oidc.',
  },
  SSO_OIDC_TOKEN_ENDPOINT: {
    readBy: ['@novu/ee-auth'],
    description: 'OIDC token endpoint, when discovery does not provide it.',
  },
  SSO_OIDC_USER_INFO_ENDPOINT: {
    readBy: ['@novu/ee-auth'],
    description: 'OIDC user info endpoint, when discovery does not provide it.',
  },
  SSO_SAML_ALLOW_IDP_INITIATED: {
    readBy: ['@novu/ee-auth'],
    description: '"true" accepts IdP-initiated SAML logins. Logins started from the dashboard always work.',
  },
  SSO_SAML_ATTR_EMAIL: {
    readBy: ['@novu/ee-auth'],
    description: 'SAML attribute that holds the email. Unset uses email.',
  },
  SSO_SAML_ATTR_EMAIL_VERIFIED: {
    readBy: ['@novu/ee-auth'],
    description: 'SAML attribute that marks the email verified. Unset uses email_verified.',
  },
  SSO_SAML_ATTR_FIRST_NAME: {
    readBy: ['@novu/ee-auth'],
    description: 'SAML attribute that holds the first name. Unset uses firstName.',
  },
  SSO_SAML_ATTR_LAST_NAME: {
    readBy: ['@novu/ee-auth'],
    description: 'SAML attribute that holds the last name. Unset uses lastName.',
  },
  SSO_SAML_ATTR_NAME: {
    readBy: ['@novu/ee-auth'],
    description: 'SAML attribute that holds the full name. Unset uses name.',
  },
  SSO_SAML_AUDIENCE: {
    readBy: ['@novu/ee-auth'],
    description: 'Expected SAML audience.',
  },
  SSO_SAML_CERTIFICATE: {
    readBy: ['@novu/ee-auth'],
    description: 'IdP signing certificate for SAML responses.',
  },
  SSO_SAML_DIGEST_ALGORITHM: {
    readBy: ['@novu/ee-auth'],
    description: 'SAML digest algorithm.',
  },
  SSO_SAML_DOMAIN: {
    readBy: ['@novu/ee-auth'],
    description: 'Email domain that signs in through SAML.',
  },
  SSO_SAML_ENABLED: {
    readBy: ['@novu/ee-auth'],
    description:
      '"true" turns on SAML sign-in on self-hosted enterprise. Also needs SSO_SAML_ENTRY_POINT and either SSO_SAML_IDP_METADATA or SSO_SAML_IDP_ENTITY_ID.',
  },
  SSO_SAML_ENTRY_POINT: {
    readBy: ['@novu/ee-auth'],
    description: 'IdP single sign-on URL. Its origin is also a trusted origin for Better Auth.',
  },
  SSO_SAML_IDENTIFIER_FORMAT: {
    readBy: ['@novu/ee-auth'],
    description: 'SAML NameID format.',
  },
  SSO_SAML_IDP_ENTITY_ID: {
    readBy: ['@novu/ee-auth'],
    description: 'IdP entity ID for a manual SAML setup without IdP metadata. Unset falls back to SSO_SAML_ISSUER.',
  },
  SSO_SAML_IDP_METADATA: {
    readBy: ['@novu/ee-auth'],
    description: 'IdP metadata XML. Replaces SSO_SAML_IDP_ENTITY_ID.',
  },
  SSO_SAML_ISSUER: {
    readBy: ['@novu/ee-auth'],
    description: 'Service provider entity ID. Unset uses BETTER_AUTH_BASE_URL.',
  },
  SSO_SAML_PROVIDER_ID: {
    readBy: ['@novu/ee-auth'],
    description: 'Better Auth provider id for SAML. Unset uses enterprise-sso-saml.',
  },
  SSO_SAML_SIGNATURE_ALGORITHM: {
    readBy: ['@novu/ee-auth'],
    description: 'SAML signature algorithm.',
  },
  SSO_SAML_SP_METADATA: {
    readBy: ['@novu/ee-auth'],
    description: 'Service provider metadata XML, instead of the generated one.',
  },
  SSO_SAML_WANT_ASSERTIONS_SIGNED: {
    readBy: ['@novu/ee-auth'],
    description: '"true" rejects SAML assertions that are not signed.',
  },
  STEP_RESOLVER_CF_ACCOUNT_ID: {
    description: 'Cloudflare account that hosts deployed step resolvers.',
  },
  STEP_RESOLVER_CF_API_TOKEN: {
    description: 'Cloudflare API token for deploying step resolvers.',
  },
  STEP_RESOLVER_CF_DISPATCH_NAMESPACE: {
    description: 'Cloudflare Workers for Platforms dispatch namespace for step resolvers.',
  },
  STEP_RESOLVER_CF_PLACEMENT_REGION: {
    description: 'Cloudflare placement region for step resolvers. Unset lets Cloudflare choose.',
  },
  SUBSCRIBER_WIDGET_JWT_EXPIRATION_TIME: {
    default: '15 days',
    description: 'Lifetime of subscriber session JWTs, as a jsonwebtoken duration such as "15 days".',
  },
  SYSTEM_NOTIFICATIONS_AWS_ACCESS_KEY_ID: {
    readBy: ['@novu/ee-auth'],
    description: 'AWS access key for system emails with SYSTEM_NOTIFICATIONS_PROVIDER=ses.',
  },
  SYSTEM_NOTIFICATIONS_AWS_REGION: {
    readBy: ['@novu/ee-auth'],
    description: 'AWS region for system emails with SYSTEM_NOTIFICATIONS_PROVIDER=ses.',
  },
  SYSTEM_NOTIFICATIONS_AWS_SECRET_ACCESS_KEY: {
    readBy: ['@novu/ee-auth'],
    description: 'AWS secret key for system emails with SYSTEM_NOTIFICATIONS_PROVIDER=ses.',
  },
  SYSTEM_NOTIFICATIONS_MAILGUN_DOMAIN: {
    readBy: ['@novu/ee-auth'],
    description: 'Mailgun domain for system emails with SYSTEM_NOTIFICATIONS_PROVIDER=mailgun.',
  },
  SYSTEM_NOTIFICATIONS_MAILGUN_USERNAME: {
    readBy: ['@novu/ee-auth'],
    description: 'Mailgun username for system emails with SYSTEM_NOTIFICATIONS_PROVIDER=mailgun.',
  },
  SYSTEM_NOTIFICATIONS_PROVIDER: {
    readBy: ['@novu/ee-auth'],
    description:
      'Email provider for self-hosted enterprise system emails, such as verification and invites. System emails are off unless this and SYSTEM_NOTIFICATIONS_SENDER_EMAIL are set.',
  },
  SYSTEM_NOTIFICATIONS_PROVIDER_API_KEY: {
    readBy: ['@novu/ee-auth'],
    description: 'API key of SYSTEM_NOTIFICATIONS_PROVIDER.',
  },
  SYSTEM_NOTIFICATIONS_SENDER_EMAIL: {
    readBy: ['@novu/ee-auth'],
    description: 'Sender address of system emails.',
  },
  SYSTEM_NOTIFICATIONS_SENDER_NAME: {
    readBy: ['@novu/ee-auth'],
    description: 'Sender name of system emails. Unset uses Novu.',
  },
  TELEGRAM_API_BASE_URL: {
    default: 'https://api.telegram.org',
    description: 'Telegram Bot API URL.',
  },
  THALAMUS_CF_API_KEY: {
    description: 'API key sent to the managed agent runtime worker.',
  },
  THALAMUS_CF_URL: {
    format: 'url',
    boot: { api: { when: 'thalamus', required: true } },
    description: 'URL of the managed agent runtime (Thalamus) worker. Unset turns managed agents off.',
  },
  THALAMUS_WEBHOOK_SECRET: {
    boot: { api: { required: 'thalamus' } },
    description: 'Secret that signs webhooks between the api and the managed agent runtime.',
  },
  VERCEL_BASE_URL: {
    format: 'url',
    boot: { api: { when: 'local-or-test' } },
    description: 'Vercel API URL.',
  },
  VERCEL_CLIENT_ID: {
    description: 'Vercel integration OAuth client id.',
  },
  VERCEL_CLIENT_SECRET: {
    description: 'Vercel integration OAuth client secret. Also verifies Vercel webhooks.',
  },
  VERCEL_REDIRECT_URI: {
    format: 'url',
    boot: { api: { when: 'local-or-test' } },
    description: 'OAuth redirect URI registered for the Vercel integration.',
  },
  WIDGET_BASE_URL: {
    description: 'Legacy notification widget origin allowed by CORS.',
  },
} satisfies Record<string, EnvVarDefinition>;

export const { env, validateEnv, warnDeprecatedEnv } = createAppEnv(appEnvSchema, {
  service: 'api',
  checkFeatureFlags: true,
});
