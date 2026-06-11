#!/usr/bin/env node
/**
 * Watch and print Novu portless service URLs from ~/.portless/routes.json.
 *
 * Usage: node scripts/portless-urls.mjs watch
 */
import { fileURLToPath } from 'node:url';
import {
  findPortlessNgrokUrl,
  findServiceRoute,
  hostnameMatchesService,
  isNgrokMode,
  normalizeNgrokDomain,
  readRoutes,
} from './portless-ngrok.mjs';

const API_SERVICE = 'api.novu';

const NOVU_SERVICES = [
  { name: 'api.novu', label: 'API' },
  { name: 'dashboard.novu', label: 'Dashboard' },
  { name: 'ws.novu', label: 'WebSocket' },
  { name: 'playground.novu', label: 'Playground' },
];

function serviceLabel(hostname) {
  for (const { name, label } of NOVU_SERVICES) {
    if (hostnameMatchesService(hostname, name)) {
      return label;
    }
  }

  return hostname;
}

function isNovuRoute(route) {
  if (!route?.hostname) {
    return false;
  }

  for (const { name } of NOVU_SERVICES) {
    if (hostnameMatchesService(route.hostname, name)) {
      return true;
    }
  }

  return false;
}

function resolveApiPublicUrl() {
  if (!isNgrokMode()) {
    return undefined;
  }

  const reserved = normalizeNgrokDomain(process.env.PORTLESS_NGROK_DOMAIN);

  if (reserved && findServiceRoute(API_SERVICE)) {
    return reserved;
  }

  return findPortlessNgrokUrl(API_SERVICE);
}

function formatRouteLine(route) {
  const url = `https://${route.hostname}`;
  const portSuffix = route.port ? `  (proxy → 127.0.0.1:${route.port})` : '';
  const ngrokSuffix = route.ngrokUrl ? `  ngrok: ${route.ngrokUrl}` : '';

  return `  ${serviceLabel(route.hostname)}  ${url}${portSuffix}${ngrokSuffix}`;
}

function formatBanner(routes, apiPublicUrl) {
  const lines = ['', '  Portless URLs', ''];

  if (apiPublicUrl) {
    lines.push('  API public (ngrok) — AGENT_API_HOSTNAME', `  ${apiPublicUrl}`, '');
  }

  if (routes.length === 0) {
    lines.push('  Waiting for portless routes…', '  Start api / dashboard / ws / playground with start:portless', '');
  } else {
    for (const route of routes) {
      lines.push(formatRouteLine(route));
    }

    lines.push('');
  }

  if (apiPublicUrl || isNgrokMode()) {
    lines.push('  Copy API public URL: pnpm portless:ngrok:url', '');
  }

  return lines.join('\n');
}

function collectNovuRoutes() {
  const routes = readRoutes().filter(isNovuRoute);

  routes.sort((a, b) => serviceLabel(a.hostname).localeCompare(serviceLabel(b.hostname)));

  return routes;
}

function watchUrls() {
  process.stdout.write('[portless-urls] watching ~/.portless/routes.json …\n');

  let lastBanner = '';

  const tick = () => {
    const routes = collectNovuRoutes();
    const apiPublicUrl = resolveApiPublicUrl();
    const banner = formatBanner(routes, apiPublicUrl);

    if (banner !== lastBanner) {
      lastBanner = banner;
      process.stdout.write(banner);
    }
  };

  tick();
  setInterval(tick, 1000);
}

const isCli = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];

if (isCli) {
  const command = process.argv[2];

  if (command === 'watch') {
    watchUrls();
  } else {
    console.error('[portless-urls] usage: node scripts/portless-urls.mjs watch');
    process.exit(1);
  }
}
