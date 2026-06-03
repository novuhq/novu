import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { DcrFixtureManifest, DcrFixtureSet } from './types';

function readJsonFile<T>(filePath: string): T {
  return JSON.parse(readFileSync(filePath, 'utf8')) as T;
}

function readOptionalJsonFile<T>(filePath: string): T | undefined {
  try {
    return readJsonFile<T>(filePath);
  } catch {
    return undefined;
  }
}

/**
 * Load a recorded DCR fixture directory. Expected layout:
 *
 * ```
 * __fixtures__/<mcp-id>/
 *   manifest.json
 *   prm.json
 *   as-metadata.json
 *   dcr-register-response.json      # optional
 *   token-exchange-response.json    # optional
 * ```
 */
export function loadDcrFixtureDirectory(fixtureDir: string): DcrFixtureSet {
  const manifest = readJsonFile<DcrFixtureManifest>(join(fixtureDir, 'manifest.json'));

  return {
    manifest,
    prm: readJsonFile<Record<string, unknown>>(join(fixtureDir, 'prm.json')),
    asMetadata: readJsonFile<Record<string, unknown>>(join(fixtureDir, 'as-metadata.json')),
    dcrRegisterResponse: readOptionalJsonFile<Record<string, unknown>>(join(fixtureDir, 'dcr-register-response.json')),
    tokenExchangeResponse: readOptionalJsonFile<Record<string, unknown>>(
      join(fixtureDir, 'token-exchange-response.json')
    ),
  };
}

export type SafeJsonRequestArgs = {
  url: string;
  method?: string;
};

export type SafeJsonResponse<T> = {
  statusCode: number;
  statusMessage: string;
  headers: Record<string, string | string[] | undefined>;
  body: T;
};

export type SafeRawResponse = {
  statusCode: number;
  statusMessage: string;
  headers: Record<string, string | string[] | undefined>;
  body: Buffer;
};

function jsonResponse<T>(statusCode: number, body: T): SafeJsonResponse<T> {
  return { statusCode, statusMessage: 'OK', headers: {}, body };
}

function rawResponse(statusCode: number, headers: Record<string, string> = {}): SafeRawResponse {
  return { statusCode, statusMessage: '', headers, body: Buffer.alloc(0) };
}

function urlMatches(url: string, candidate: string | undefined): boolean {
  if (!candidate) {
    return false;
  }

  return url === candidate || url.startsWith(`${candidate}/`) || candidate.startsWith(`${url}/`);
}

/**
 * Build deterministic SSRF-safe outbound stubs for a recorded fixture set.
 * Pass the returned handlers to `sinon.stub(SsrfModule, 'safeOutboundJsonRequest')`
 * and `safeOutboundRequest`.
 */
export function createDcrFixtureOutboundHandlers(fixture: DcrFixtureSet): {
  handleJsonRequest<T>(args: SafeJsonRequestArgs): SafeJsonResponse<T>;
  handleRawRequest(args: SafeJsonRequestArgs): SafeRawResponse;
} {
  const { manifest, prm, asMetadata, dcrRegisterResponse, tokenExchangeResponse } = fixture;
  const registrationEndpoint =
    manifest.registrationEndpoint ??
    (typeof asMetadata.registration_endpoint === 'string' ? asMetadata.registration_endpoint : undefined);
  const tokenEndpoint =
    manifest.tokenEndpoint ?? (typeof asMetadata.token_endpoint === 'string' ? asMetadata.token_endpoint : undefined);

  return {
    handleJsonRequest<T>(args: SafeJsonRequestArgs): SafeJsonResponse<T> {
      const method = args.method ?? 'GET';

      if (method === 'POST' && urlMatches(args.url, registrationEndpoint) && dcrRegisterResponse) {
        return jsonResponse(201, dcrRegisterResponse) as SafeJsonResponse<T>;
      }

      if (method === 'POST' && urlMatches(args.url, tokenEndpoint) && tokenExchangeResponse) {
        return jsonResponse(200, tokenExchangeResponse) as SafeJsonResponse<T>;
      }

      if (method === 'GET' && args.url.includes('/.well-known/oauth-protected-resource')) {
        return jsonResponse(200, prm) as SafeJsonResponse<T>;
      }

      if (
        method === 'GET' &&
        (args.url.includes('/.well-known/oauth-authorization-server') ||
          args.url.includes('/.well-known/openid-configuration'))
      ) {
        return jsonResponse(200, asMetadata) as SafeJsonResponse<T>;
      }

      throw new Error(`Unexpected fixture JSON request: ${method} ${args.url}`);
    },
    handleRawRequest(args: SafeJsonRequestArgs): SafeRawResponse {
      if (args.url === manifest.mcpUrl) {
        return rawResponse(401);
      }

      throw new Error(`Unexpected fixture raw request: ${args.method ?? 'GET'} ${args.url}`);
    },
  };
}
