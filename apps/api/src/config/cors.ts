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

  const origin = (req.headers as any)?.origin || '';

  if (
    ['test', 'local'].includes(process.env.NODE_ENV) ||
    isWidgetRoute(req.url) ||
    isBlueprintRoute(req.url) ||
    hasPermittedDeployPreviewOrigin(origin)
  ) {
    corsOptions.origin = '*';
  } else {
    corsOptions.origin = [process.env.FRONT_BASE_URL];
    if (process.env.WIDGET_BASE_URL) {
      corsOptions.origin.push(process.env.WIDGET_BASE_URL);
    }
  }

  callback(null as unknown as Error, corsOptions);
};

function isWidgetRoute(url: string) {
  return url.startsWith('/v1/widgets');
}

function isBlueprintRoute(url: string) {
  return url.startsWith('/v1/blueprints');
}

function hasPermittedDeployPreviewOrigin(origin: string) {
  const shouldAllowOrigin =
    process.env.PR_PREVIEW_ROOT_URL &&
    process.env.NODE_ENV === 'dev' &&
    origin.includes(process.env.PR_PREVIEW_ROOT_URL);

  Logger.verbose(`Should allow deploy preview? ${shouldAllowOrigin ? 'Yes' : 'No'}.`, {
    curEnv: process.env.NODE_ENV,
    previewUrlRoot: process.env.PR_PREVIEW_ROOT_URL,
    origin,
  });

  return shouldAllowOrigin;
}
