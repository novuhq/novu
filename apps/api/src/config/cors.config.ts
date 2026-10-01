import { INestApplication } from '@nestjs/common';
import { HttpRequestHeaderKeysEnum } from '@novu/application-generic';
import { resolveHumanWebsiteBaseUrl } from '../app/shared/helpers/resolve-human-website-base-url';

const ALLOWED_ORIGINS_REGEX = new RegExp(process.env.FRONT_BASE_URL || '');

/**
 * Static site behind `@novu/human` (`packages/human/site`). Its `/connect`
 * landing page calls the public, token-authorized Telegram and Slack setup
 * endpoints from the browser, so it needs an explicit CORS grant — scoped to
 * those routes only (see `isHumanSetupRoute`), since `credentials` stays on.
 * Hardcoded like the `dashboard.novu.co` fallback in `resolveDashboardBaseUrl`
 * — it is a Novu-owned domain, and an env var here would fail silently when
 * unset.
 */
const HUMAN_SITE_ORIGINS = ['https://www.gethuman.md', 'https://gethuman.md'];

type CorsDelegateOptions = {
  origin: boolean | string | string[];
  preflightContinue: boolean;
  maxAge: number;
  credentials: boolean;
  allowedHeaders: string[];
  methods: string[];
};

type CorsRequest = {
  url: string;
  headers?: {
    origin?: string;
  };
};

export const corsOptionsDelegate: Parameters<INestApplication['enableCors']>[0] = (
  req: CorsRequest,
  callback: (error: Error | null, options: CorsDelegateOptions) => void
) => {
  const corsOptions: CorsDelegateOptions = {
    origin: false as boolean | string | string[],
    preflightContinue: false,
    maxAge: 86400,
    credentials: true,
    allowedHeaders: Object.values(HttpRequestHeaderKeysEnum),
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  };

  if (enableWildcard(req)) {
    corsOptions.origin = '*';
  } else {
    corsOptions.origin = [];

    const requestOrigin = origin(req);

    if (ALLOWED_ORIGINS_REGEX.test(requestOrigin)) {
      corsOptions.origin.push(requestOrigin);
    }
    if (
      isHumanSetupRoute(req.url) &&
      HUMAN_SITE_ORIGINS.includes(requestOrigin) &&
      !corsOptions.origin.includes(requestOrigin)
    ) {
      corsOptions.origin.push(requestOrigin);
    }
    if (process.env.WIDGET_BASE_URL) {
      corsOptions.origin.push(process.env.WIDGET_BASE_URL);
    }
    // Enable CORS for the docs
    if (process.env.DOCS_BASE_URL) {
      corsOptions.origin.push(process.env.DOCS_BASE_URL);
    }
    // The invite page on the Human website calls the public invite endpoints (token-only, no cookies).
    const humanWebsite = isHumanInviteRoute(req.url) ? humanWebsiteOrigin() : undefined;
    if (humanWebsite) {
      corsOptions.origin.push(humanWebsite);
    }
  }

  callback(null, corsOptions);
};

function enableWildcard(req: CorsRequest): boolean {
  return (
    (isDevelopmentEnvironment() ||
      isWidgetRoute(req.url) ||
      isInboxRoute(req.url) ||
      isBlueprintRoute(req.url) ||
      isWebChatRoute(req.url)) &&
    !isBetterAuthRoute(req.url)
  );
}

// BetterAuth routes require explicit origin validation for credential-based requests
function isBetterAuthRoute(url: string): boolean {
  return url.startsWith('/v1/better-auth');
}

// The only routes the gethuman.md `/connect` page calls: token-authorized, public setup endpoints
function isHumanSetupRoute(url: string): boolean {
  return url.startsWith('/v1/integrations/mobile-configure') || url.startsWith('/v1/agents/public/slack/setup');
}

function isWidgetRoute(url: string): boolean {
  return url.startsWith('/v1/widgets');
}

function isInboxRoute(url: string): boolean {
  return url.startsWith('/v1/inbox');
}

function isBlueprintRoute(url: string): boolean {
  return url.startsWith('/v1/blueprints');
}

/** The public invite page endpoints; `POST /v1/human/invites` (create, authenticated) is excluded. */
function isHumanInviteRoute(url: string): boolean {
  return url.startsWith('/v1/human/invites/');
}

function humanWebsiteOrigin(): string | undefined {
  try {
    return new URL(resolveHumanWebsiteBaseUrl()).origin;
  } catch {
    return undefined;
  }
}

function isWebChatRoute(url: string): boolean {
  return url.startsWith('/v1/web-chat');
}

function isDevelopmentEnvironment(): boolean {
  return ['test', 'local'].includes(process.env.NODE_ENV || '');
}

function origin(req: CorsRequest): string {
  const headerOrigin = req.headers?.origin;

  if (typeof headerOrigin !== 'string') {
    return '';
  }

  return headerOrigin;
}
