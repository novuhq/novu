import * as serverlessExpress from '@vendia/serverless-express';
import { Context, Handler } from 'aws-lambda';
import * as express from 'express';
import { bootstrap } from './bootstrap';

let cachedServer: Handler;

async function init() {
  if (!cachedServer) {
    const expressApp = express();
    const nestApp = await bootstrap(expressApp);
    cachedServer = (serverlessExpress as any)({ app: expressApp });
  }

  return cachedServer;
}

export const handler = async (event: any, context: Context, callback: any) => {
  const server = await init();
  return server(event, context, callback);
};
