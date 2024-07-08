import { INestApplication, Logger } from '@nestjs/common';
import { HttpRequestHeaderKeysEnum } from '../app/shared/framework/types';

export const corsOptionsDelegate: Parameters<INestApplication['enableCors']>[0] = function (req: Request, callback) {
  const corsOptions: Parameters<typeof callback>[1] = {
    origin: false as boolean | string | string[],
    preflightContinue: false,
    maxAge: 86400,
    allowedHeaders: Object.values(HttpRequestHeaderKeysEnum),
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  };

  const origin = extractOrigin(req);

  if (enableWildcard(req)) {
    corsOptions.origin = '*';
  } else {
    corsOptions.origin = [];

    if (process.env.FRONT_BASE_URL) {
      corsOptions.origin.push(process.env.FRONT_BASE_URL);
    }
    if (process.env.LEGACY_V1_FRONT_BASE_URL) {
      corsOptions.origin.push(process.env.LEGACY_V1_FRONT_BASE_URL);
    }
    if (process.env.WIDGET_BASE_URL) {
      corsOptions.origin.push(process.env.WIDGET_BASE_URL);
    }
  }

  const shouldDisableCorsForPreviewUrls = isPermittedDeployPreviewOrigin(origin);

  Logger.verbose(`Should allow deploy preview? ${shouldDisableCorsForPreviewUrls ? 'Yes' : 'No'}.`, {
    curEnv: process.env.NODE_ENV,
    previewUrlRoot: process.env.PR_PREVIEW_ROOT_URL,
    origin,
  });

  callback(null as unknown as Error, corsOptions);
};

function enableWildcard(req: Request): boolean {
  return (
    isSandboxEnvironment() ||
    isWidgetRoute(req.url) ||
    isBlueprintRoute(req.url) ||
    isPermittedDeployPreviewOrigin(extractOrigin(req))
  );
}

function isWidgetRoute(url: string): boolean {
  return url.startsWith('/v1/widgets');
}

function isBlueprintRoute(url: string): boolean {
  return url.startsWith('/v1/blueprints');
}

function isSandboxEnvironment(): boolean {
  return ['test', 'local'].includes(process.env.NODE_ENV);
}

export function isPermittedDeployPreviewOrigin(origin: string | string[]): boolean {
  if (!process.env.PR_PREVIEW_ROOT_URL || process.env.NODE_ENV !== 'dev') {
    return false;
  }

  return origin.includes(process.env.PR_PREVIEW_ROOT_URL);
}

function extractOrigin(req: Request): string {
  return (req.headers as any)?.origin || '';
}
