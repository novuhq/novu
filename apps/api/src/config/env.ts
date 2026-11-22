import { createAppEnv } from '@novu/application-generic';

/**
 * Variables only the api reads, added to the shared ones in
 * libs/application-generic/src/config/env.schema.ts. Read both with `env.X` from this file.
 */
export const { env, warnDeprecatedEnv } = createAppEnv({
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
  CLERK_ISSUER_URL: {
    description: 'Clerk issuer URL, advertised as the authorization server in the OAuth protected-resource metadata.',
  },
  CLIENT_IP_HEADER: {
    description:
      'Single-IP header set by the edge proxy (cf-connecting-ip on Novu Cloud). When set, only that header is trusted for the client IP. Unset trusts the first proxy header.',
  },
  CONTEXT_DEV_API_KEY: {
    description:
      'context.dev API key for enriching new organizations with brand details. Unset turns brand enrichment off.',
  },
  DISABLE_USER_REGISTRATION: {
    type: 'boolean',
    description: 'Rejects new account sign-ups.',
  },
  DOCS_BASE_URL: {
    description: 'Docs site origin allowed by CORS.',
  },
  DOMAIN_CONNECT_PRIVATE_KEY: {
    description: 'Private key that signs Domain Connect requests, which set up DNS records for custom domains.',
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
  KEYLESS_DEMO_REPLY_CAP: {
    description:
      'Agent replies in a keyless demo conversation. Unset or not a non-negative integer uses the built-in cap.',
  },
  KEYLESS_ENV_CREATE_CAP_PER_IP_PER_DAY: {
    description:
      'Keyless environments one IP can create per day. Unset or not a non-negative integer uses the built-in cap.',
  },
  KEYLESS_GENERATE_CAP_PER_IP_PER_DAY: {
    description:
      'Keyless generate requests one IP can make per day. Unset or not a non-negative integer uses the built-in cap.',
  },
  KEYLESS_HUMAN_INTERACTION_CAP: {
    description:
      'Human interactions a keyless environment can create before delivery is replaced by the sign-up prompt. Unset or not a non-negative integer uses the built-in cap.',
  },
  KEYLESS_MAX_AGENTS_PER_ENV: {
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
  MAIL_SERVER_DOMAIN: {
    description: 'Inbound mail server host, shown as the MX target in the DNS records for custom domains.',
  },
  NOVU_API_KEY: {
    description:
      'Novu Cloud secret key the api uses to send its own emails, such as invites and password resets, in dev and production.',
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
  NOVU_GITHUB_MCP_APP_CLIENT_ID: {
    description:
      "Client id of Novu's GitHub OAuth app for GitHub MCP connections. Unset reports the credentials as missing.",
  },
  NOVU_GITHUB_MCP_APP_CLIENT_SECRET: {
    description:
      "Client secret of Novu's GitHub OAuth app for GitHub MCP connections. Unset reports the credentials as missing.",
  },
  NOVU_INTERNAL_SECRET_KEY: {
    description: "Secret key of Novu's internal environment, which runs the api's own workflows and support requests.",
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
  SLACK_API_URL: {
    description: 'Slack Web API URL override, used to point agents at a Slack emulator in tests.',
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
  TELEGRAM_API_BASE_URL: {
    default: 'https://api.telegram.org',
    description: 'Telegram Bot API URL.',
  },
  THALAMUS_CF_API_KEY: {
    description: 'API key sent to the managed agent runtime worker.',
  },
  THALAMUS_CF_URL: {
    description: 'URL of the managed agent runtime (Thalamus) worker. Unset turns managed agents off.',
  },
  THALAMUS_WEBHOOK_SECRET: {
    description: 'Secret that signs webhooks between the api and the managed agent runtime.',
  },
  VERCEL_BASE_URL: {
    description: 'Vercel API URL.',
  },
  VERCEL_CLIENT_ID: {
    description: 'Vercel integration OAuth client id.',
  },
  VERCEL_CLIENT_SECRET: {
    description: 'Vercel integration OAuth client secret. Also verifies Vercel webhooks.',
  },
  VERCEL_REDIRECT_URI: {
    description: 'OAuth redirect URI registered for the Vercel integration.',
  },
  WIDGET_BASE_URL: {
    description: 'Legacy notification widget origin allowed by CORS.',
  },
});
