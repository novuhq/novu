import { readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { HOST_IDS } from './host-ids';
import { markdownNotFoundResponse, prefersMarkdown, servesAppResource } from './markdown-not-found';

const appDir = fileURLToPath(new URL('../app', import.meta.url));

/** Every page and route handler, as one address the app really serves. */
function routesIn(dir: string, segments: string[], found: string[]) {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) {
      if (name.startsWith('(') && name.endsWith(')')) {
        routesIn(full, segments, found);
        continue;
      }
      if (name.startsWith('@')) continue;
      routesIn(full, [...segments, name], found);
      continue;
    }

    if (name === 'page.tsx' || name === 'route.ts') found.push(sampleFor(segments));
    if (name === 'sitemap.ts') found.push(metadataPath(segments, 'sitemap.xml'));
    if (name === 'robots.ts') found.push(metadataPath(segments, 'robots.txt'));
    if (name === 'icon.svg' || name === 'icon.png' || name === 'icon.tsx') {
      found.push(metadataPath(segments, 'icon'));
    }
    if (name.startsWith('apple-icon.')) found.push(metadataPath(segments, 'apple-icon'));
    if (name.startsWith('opengraph-image.') && !name.endsWith('.alt.txt')) {
      found.push(metadataPath(segments, 'opengraph-image'));
    }
  }
}

function sampleFor(segments: string[]): string {
  if (segments.includes('[host]')) {
    const tail = segments[segments.length - 1] === 'index.md' ? '/index.md' : '';

    return `/claude-code${tail}`;
  }

  if (segments.some((segment) => segment.startsWith('['))) {
    const concrete = segments.filter((segment) => !segment.startsWith('['));

    return `/${concrete.join('/')}/sample`;
  }

  return segments.length === 0 ? '/' : `/${segments.join('/')}`;
}

function metadataPath(segments: string[], name: string): string {
  const concrete = segments.filter((segment) => !segment.startsWith('['));
  const prefix = concrete.length === 0 ? '' : `/${concrete.join('/')}`;

  return `${prefix}/${name}`;
}

describe('markdown 404', () => {
  const routes: string[] = [];
  routesIn(appDir, [], routes);

  it('keeps every real route, and only those, out of the Markdown 404', () => {
    expect(routes.length).toBeGreaterThan(10);
    for (const route of routes) {
      expect(servesAppResource(route), route).toBe(true);
    }

    for (const id of HOST_IDS) {
      expect(servesAppResource(`/${id}`)).toBe(true);
      expect(servesAppResource(`/${id}.md`)).toBe(true);
      expect(servesAppResource(`/${id}/index.md`)).toBe(true);
    }

    expect(servesAppResource('/sapien/')).toBe(true);
    expect(servesAppResource('/some-path-that-does-not-exist')).toBe(false);
    expect(servesAppResource('/not-a-host')).toBe(false);
    expect(servesAppResource('/not-a-host.md')).toBe(false);
    expect(servesAppResource('/not-a-host/index.md')).toBe(false);
    expect(servesAppResource('/inbox/missing')).toBe(false);
    expect(servesAppResource('/connect/slack')).toBe(false);
  });

  it('treats text/markdown as the wanted type only when it outranks HTML', () => {
    expect(prefersMarkdown('text/markdown')).toBe(true);
    expect(prefersMarkdown('text/markdown, text/html;q=0.9')).toBe(true);
    expect(prefersMarkdown('text/html, text/markdown;q=0.8')).toBe(false);
    expect(prefersMarkdown('text/markdown;q=0')).toBe(false);
    expect(prefersMarkdown('text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8')).toBe(false);
    expect(prefersMarkdown(null)).toBe(false);
  });

  it('explains the 404 in Markdown and links the way back', async () => {
    const response = markdownNotFoundResponse('/some-path-that-does-not-exist');
    expect(response.status).toBe(404);
    expect(response.headers.get('content-type')).toContain('text/markdown');

    const body = await response.text();
    const explanation = body
      .replace(/\[[^\]]+\]\([^)]+\)/g, '')
      .replace(/https?:\/\/\S+/g, '')
      .replace(/[#>*_`-]/g, '')
      .trim();
    expect(explanation.length).toBeGreaterThanOrEqual(20);
    expect(body).toContain('https://www.agentinbox.md/llms.txt');
    expect(body).toContain('https://www.agentinbox.md/sitemap.xml');
    expect(body).toContain('https://www.agentinbox.md/index.md');
    expect(body).toContain('/some-path-that-does-not-exist');
    expect(body).not.toContain('<html');
  });
});
