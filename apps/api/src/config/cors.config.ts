import { INestApplication } from '@nestjs/common';
import { HttpRequestHeaderKeysEnum } from '@novu/application-generic';

export const corsOptionsDelegate: Parameters<INestApplication['enableCors']>[0] = function (req: Request, callback) {
  const corsOptions: Parameters<typeof callback>[1] = {
    origin: false as boolean | string | string[],
    preflightContinue: false,
    maxAge: 86400,
    allowedHeaders: Object.values(HttpRequestHeaderKeysEnum),
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  };

  if (enableWildcard(req)) {
    corsOptions.origin = '*';
  } else {
    corsOptions.origin = [];

    if (process.env.FRONT_BASE_URL) {
      corsOptions.origin.push(process.env.FRONT_BASE_URL);
    }
    if (process.env.DASHBOARD_V2_BASE_URL) {
      corsOptions.origin.push(process.env.DASHBOARD_V2_BASE_URL);
    }
    if (process.env.LEGACY_STAGING_DASHBOARD_URL) {
      corsOptions.origin.push(process.env.LEGACY_STAGING_DASHBOARD_URL);
    }
    if (process.env.WIDGET_BASE_URL) {
      corsOptions.origin.push(process.env.WIDGET_BASE_URL);
    }
    // Enable preview deployments in staging environment for Netlify and Vercel
    if (process.env.NODE_ENV === 'dev') {
      corsOptions.origin.push(origin(req));
    }
  }

  callback(null as unknown as Error, corsOptions);
};

function enableWildcard(req: Request): boolean {
  return isSandboxEnvironment() || isWidgetRoute(req.url) || isInboxRoute(req.url) || isBlueprintRoute(req.url);
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

function isSandboxEnvironment(): boolean {
  return ['test', 'local'].includes(process.env.NODE_ENV || '');
}

function origin(req: Request): string {
  return (req.headers as any)?.origin || '';
}
