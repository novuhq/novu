import chalk from 'chalk';
import gradient from 'gradient-string';

const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const getPort = require('get-port');
import * as process from 'process';
import open from 'open';
import { logo } from './constants';

export const showWelcomeScreen = (): void => {
  const textGradient = gradient('#0099F7', '#ff3432');
  const logoGradient = gradient('#DD2476', '#FF512F');

  const items = logo.split('\n').map((row) => logoGradient(row));

  /* eslint-disable no-console */
  console.log(chalk.bold(items.join('\n')));
  console.log(chalk.bold(`                  Welcome to NOVU ECHO!`));
  console.log(chalk.bold(textGradient(`         The open-source notification infrastructure\n`)));
  /* eslint-enable  no-console */
};

export async function startStudio(anonymousId: string, requestedPort = 2022) {
  await showWelcomeScreen();
  const dev = false;
  const hostname = 'localhost';
  const availablePort = await getPort({
    port: Number(requestedPort),
  });

  const config = {
    reactStrictMode: false,
    eslint: {
      ignoreDuringBuilds: true,
    },
    experimental: {
      optimizePackageImports: ['@mantine/core', '@mantine/hooks'],
    },
  };
  const studioPackage = require.resolve('@novu/studio/bin/start.js');

  const app = next({
    conf: config,
    dev,
    hostname,
    port: availablePort,
    dir: studioPackage + '/../../',
  });
  const handle = app.getRequestHandler();

  await app.prepare();

  createServer(async (req, res) => {
    try {
      // Be sure to pass `true` as the second argument to `url.parse`.
      // This tells it to parse the query portion of the URL.
      const parsedUrl = parse(req.url, true);
      const { pathname, query } = parsedUrl;

      req.headers['x-novu-cli-anonymous'] = anonymousId;

      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  })
    .once('error', (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(availablePort, () => {
      if (requestedPort && Number(availablePort) !== Number(requestedPort)) {
        console.warn(`> Port ${requestedPort} is not available, using port ${availablePort}`);
      }
      console.log(`> Ready on http://${hostname}:${availablePort}`);

      if (process.env.NODE_ENV !== 'development') {
        open(`http://${hostname}:${availablePort}`);
      }
    });
}
