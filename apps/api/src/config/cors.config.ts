import { INestApplication } from '@nestjs/common';
import { HttpRequestHeaderKeysEnum } from '@novu/application-generic';

const ALLOWED_ORIGINS_REGEX = new RegExp(process.env.FRONT_BASE_URL || '');

export const corsOptionsDelegate: Parameters<INestApplication['enableCors']>[0] = (req: Request, callback) => {
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

    const requestOrigin = origin(req);

    if (ALLOWED_ORIGINS_REGEX.test(requestOrigin)) {
      corsOptions.origin.push(requestOrigin);
    }
    if (process.env.WIDGET_BASE_URL) {
      corsOptions.origin.push(process.env.WIDGET_BASE_URL);
    }
    // Enable CORS for the docs
    if (process.env.DOCS_BASE_URL) {
      corsOptions.origin.push(process.env.DOCS_BASE_URL);
    }
  }

  callback(null as unknown as Error, corsOptions);
};

function enableWildcard(req: Request): boolean {
  return isDevelopmentEnvironment() || isWidgetRoute(req.url) || isInboxRoute(req.url) || isBlueprintRoute(req.url);
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

function isDevelopmentEnvironment(): boolean {
  return ['test', 'local'].includes(process.env.NODE_ENV || '');
}

function origin(req: Request): string {
  return (req.headers as any)?.origin || '';
}
