import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import open from 'open';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type KeylessApiStub, startKeylessApiStub } from './__fixtures__/keyless-api-stub';
import { keylessClaim, keylessCreate, keylessStatus } from './index';

vi.mock('open', () => ({ default: vi.fn(async () => undefined) }));

const created = {
  environmentId: 'env_123',
  secretKey: 'sk_test_secret',
  applicationIdentifier: 'AppIdent123',
  apiUrl: 'https://api.novu.co',
  claimUrl: 'https://dashboard.novu.co/connect/claim?token=nvct_abc',
  expiresAt: '2026-10-17T20:16:00.000Z',
};

let stub: KeylessApiStub;
let cwd: string;
let stdout: string[];
let stderr: string[];

beforeEach(async () => {
  stub = await startKeylessApiStub();
  cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'novu-keyless-'));
  stdout = [];
  stderr = [];
  vi.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
    stdout.push(args.join(' '));
  });
  vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
    stderr.push(args.join(' '));
  });
});

afterEach(async () => {
  vi.restoreAllMocks();
  vi.mocked(open).mockClear();
  await stub.close();
  fs.rmSync(cwd, { recursive: true, force: true });
});

function readBreadcrumb(): Record<string, unknown> {
  return JSON.parse(fs.readFileSync(path.join(cwd, '.novu', 'keyless.json'), 'utf8'));
}

describe('keylessCreate', () => {
  it('creates an environment, prints the env vars and claim URL, and writes a breadcrumb without the secret', async () => {
    stub.respond('POST /v1/keyless/environments', { status: 201, body: { data: created } });

    const exitCode = await keylessCreate({ apiUrl: stub.apiUrl, source: 'cursor', cwd });

    expect(exitCode).toBe(0);
    expect(stub.requests[0].body).toEqual({ source: 'cursor' });
    const output = stdout.join('\n');
    expect(output).toContain('NOVU_SECRET_KEY=sk_test_secret');
    expect(output).toContain('NOVU_APPLICATION_IDENTIFIER=AppIdent123');
    expect(output).toContain('NOVU_API_URL=https://api.novu.co');
    expect(output).toContain(created.claimUrl);

    const breadcrumb = readBreadcrumb();
    expect(breadcrumb).toMatchObject({
      environmentId: 'env_123',
      applicationIdentifier: 'AppIdent123',
      apiUrl: 'https://api.novu.co',
      claimUrl: created.claimUrl,
      expiresAt: created.expiresAt,
    });
    expect(typeof breadcrumb.createdAt).toBe('string');
    expect(JSON.stringify(breadcrumb)).not.toContain('sk_test_secret');
  });

  it('prints only the raw payload with --json', async () => {
    stub.respond('POST /v1/keyless/environments', { status: 201, body: { data: created } });

    await keylessCreate({ apiUrl: stub.apiUrl, source: 'cursor', json: true, cwd });

    expect(stdout).toHaveLength(1);
    expect(JSON.parse(stdout[0])).toEqual(created);
  });

  it('writes the env vars to --env-file relative to the working directory', async () => {
    stub.respond('POST /v1/keyless/environments', { status: 201, body: { data: created } });

    await keylessCreate({ apiUrl: stub.apiUrl, envFile: '.env.local', cwd });

    expect(fs.readFileSync(path.join(cwd, '.env.local'), 'utf8')).toBe(
      'NOVU_SECRET_KEY=sk_test_secret\nNOVU_APPLICATION_IDENTIFIER=AppIdent123\nNOVU_API_URL=https://api.novu.co\n'
    );
  });

  it.each([
    [404, 'keyless_disabled', "Keyless isn't available on this Novu deployment"],
    [429, 'keyless_rate_limited', 'Too many keyless environments were created from this network today'],
    [429, undefined, 'Too many requests'],
    [503, 'keyless_capacity_reached', 'Keyless environments are at capacity today'],
    [503, 'keyless_unavailable', 'Keyless environments are temporarily unavailable'],
  ])('maps %i %s to a clear message and exit code 1 without writing a breadcrumb', async (status, code, expected) => {
    stub.respond('POST /v1/keyless/environments', {
      status,
      body: { statusCode: status, message: 'server message', ...(code ? { code } : {}) },
    });

    const exitCode = await keylessCreate({ apiUrl: stub.apiUrl, cwd });

    expect(exitCode).toBe(1);
    expect(stderr.join('\n')).toContain(expected);
    expect(fs.existsSync(path.join(cwd, '.novu'))).toBe(false);
  });

  it('prints the error as JSON with --json', async () => {
    stub.respond('POST /v1/keyless/environments', {
      status: 404,
      body: { statusCode: 404, message: 'Not found', code: 'keyless_disabled' },
    });

    const exitCode = await keylessCreate({ apiUrl: stub.apiUrl, json: true, cwd });

    expect(exitCode).toBe(1);
    expect(JSON.parse(stdout[0])).toEqual({
      error: { status: 404, code: 'keyless_disabled', message: expect.stringContaining("Keyless isn't available") },
    });
  });

  it('still prints the secret key when the breadcrumb and env file cannot be written', async () => {
    stub.respond('POST /v1/keyless/environments', { status: 201, body: { data: created } });
    fs.writeFileSync(path.join(cwd, '.novu'), 'not a directory');

    const exitCode = await keylessCreate({ apiUrl: stub.apiUrl, envFile: '.', cwd });

    expect(exitCode).toBe(0);
    const output = stdout.join('\n');
    expect(output).toContain('NOVU_SECRET_KEY=sk_test_secret');
    expect(output).toContain(created.claimUrl);
    expect(output).not.toContain('Saved to');
    expect(stderr.join('\n')).toContain('Could not save .novu/keyless.json');
    expect(stderr.join('\n')).toContain('Could not write .');
  });

  it('tells the agent what to say to the human', async () => {
    stub.respond('POST /v1/keyless/environments', { status: 201, body: { data: created } });

    await keylessCreate({ apiUrl: stub.apiUrl, cwd });

    expect(stdout.join('\n')).toMatch(
      /Tell the human: .*https:\/\/dashboard\.novu\.co\/connect\/claim\?token=nvct_abc/
    );
  });
});

describe('keylessStatus', () => {
  const active = {
    environmentId: 'env_123',
    applicationIdentifier: 'AppIdent123',
    status: 'active',
    expiresAt: created.expiresAt,
    claimUrl: created.claimUrl,
  };

  it('reports an active environment with exit code 0 using the ApiKey scheme', async () => {
    stub.respond('GET /v1/keyless/environments/me', { status: 200, body: { data: active } });

    const exitCode = await keylessStatus({ apiUrl: stub.apiUrl, secretKey: 'sk_test_secret', cwd });

    expect(exitCode).toBe(0);
    expect(stub.requests[0].headers.authorization).toBe('ApiKey sk_test_secret');
    const output = stdout.join('\n');
    expect(output).toContain('active');
    expect(output).toContain(created.expiresAt);
    expect(output).toContain(created.claimUrl);
  });

  it('prints the payload with --json', async () => {
    stub.respond('GET /v1/keyless/environments/me', { status: 200, body: { data: active } });

    await keylessStatus({ apiUrl: stub.apiUrl, secretKey: 'sk_test_secret', json: true, cwd });

    expect(JSON.parse(stdout[0])).toEqual(active);
  });

  it('exits 3 with key-swap instructions once claimed', async () => {
    stub.respond('GET /v1/keyless/environments/me', {
      status: 401,
      body: { statusCode: 401, code: 'keyless_environment_claimed', message: 'This environment was claimed.' },
    });

    const exitCode = await keylessStatus({ apiUrl: stub.apiUrl, secretKey: 'sk_test_secret', cwd });

    expect(exitCode).toBe(3);
    const output = stderr.join('\n');
    expect(output).toContain('NOVU_SECRET_KEY');
    expect(output).toContain('NOVU_APPLICATION_IDENTIFIER');
    expect(output).toContain('Development environment');
  });

  it('exits 4 with the API message once expired', async () => {
    stub.respond('GET /v1/keyless/environments/me', {
      status: 401,
      body: { statusCode: 401, code: 'keyless_environment_expired', message: 'This keyless environment expired on X.' },
    });

    const exitCode = await keylessStatus({ apiUrl: stub.apiUrl, secretKey: 'sk_test_secret', cwd });

    expect(exitCode).toBe(4);
    expect(stderr.join('\n')).toContain('This keyless environment expired on X.');
  });

  it('exits 1 for other errors and when no secret key is available', async () => {
    stub.respond('GET /v1/keyless/environments/me', { status: 500, body: { statusCode: 500, message: 'boom' } });

    expect(await keylessStatus({ apiUrl: stub.apiUrl, secretKey: 'sk_test_secret', cwd })).toBe(1);
    expect(await keylessStatus({ apiUrl: stub.apiUrl, cwd })).toBe(1);
    expect(stderr.join('\n')).toContain('NOVU_SECRET_KEY');
  });

  it('uses the breadcrumb API URL when none is passed', async () => {
    stub.respond('POST /v1/keyless/environments', { status: 201, body: { data: { ...created, apiUrl: stub.apiUrl } } });
    stub.respond('GET /v1/keyless/environments/me', { status: 200, body: { data: active } });
    await keylessCreate({ apiUrl: stub.apiUrl, cwd });

    const exitCode = await keylessStatus({ secretKey: 'sk_test_secret', cwd });

    expect(exitCode).toBe(0);
  });

  it('refuses to send the secret key to a breadcrumb API URL outside Novu Cloud', async () => {
    fs.mkdirSync(path.join(cwd, '.novu'));
    fs.writeFileSync(
      path.join(cwd, '.novu', 'keyless.json'),
      JSON.stringify({ ...created, apiUrl: 'https://attacker.example.com', createdAt: created.expiresAt })
    );

    const exitCode = await keylessStatus({ secretKey: 'sk_test_secret', cwd });

    expect(exitCode).toBe(1);
    expect(stderr.join('\n')).toContain('--api-url');
    expect(stub.requests).toHaveLength(0);
  });
});

describe('keylessClaim', () => {
  const originalIsTTY = process.stdout.isTTY;

  function setTTY(value: boolean): void {
    Object.defineProperty(process.stdout, 'isTTY', { value, configurable: true });
  }

  async function createWithBreadcrumb(overrides: Partial<typeof created> = {}): Promise<void> {
    stub.respond('POST /v1/keyless/environments', {
      status: 201,
      body: { data: { ...created, apiUrl: stub.apiUrl, ...overrides } },
    });
    await keylessCreate({ apiUrl: stub.apiUrl, cwd });
    stdout.length = 0;
  }

  beforeEach(() => {
    setTTY(true);
  });

  afterEach(() => {
    setTTY(originalIsTTY);
  });

  it('prints the breadcrumb claim URL and opens it in a TTY', async () => {
    await createWithBreadcrumb();

    const exitCode = await keylessClaim({ cwd });

    expect(exitCode).toBe(0);
    expect(stdout.join('\n')).toContain(created.claimUrl);
    expect(open).toHaveBeenCalledWith(created.claimUrl);
  });

  it('does not open the browser with --no-open or outside a TTY', async () => {
    await createWithBreadcrumb();

    await keylessClaim({ cwd, open: false });
    setTTY(false);
    await keylessClaim({ cwd });

    expect(open).not.toHaveBeenCalled();
    expect(stdout.filter((line) => line.includes(created.claimUrl))).toHaveLength(2);
  });

  it('refreshes the claim URL via /me when a secret key is available', async () => {
    await createWithBreadcrumb();
    const fresh = 'https://dashboard.novu.co/connect/claim?token=nvct_fresh';
    stub.respond('GET /v1/keyless/environments/me', {
      status: 200,
      body: {
        data: {
          environmentId: 'env_123',
          applicationIdentifier: 'AppIdent123',
          status: 'active',
          expiresAt: created.expiresAt,
          claimUrl: fresh,
        },
      },
    });

    await keylessClaim({ cwd, secretKey: 'sk_test_secret' });

    expect(open).toHaveBeenCalledWith(fresh);
  });

  it('falls back to the breadcrumb when /me fails with a non-terminal error', async () => {
    await createWithBreadcrumb();
    stub.respond('GET /v1/keyless/environments/me', {
      status: 404,
      body: { statusCode: 404, code: 'keyless_environment_not_found', message: 'nope' },
    });

    const exitCode = await keylessClaim({ cwd, secretKey: 'sk_real_key' });

    expect(exitCode).toBe(0);
    expect(open).toHaveBeenCalledWith(created.claimUrl);
  });

  it('does not send the secret key to an untrusted breadcrumb API URL and uses the saved claim URL', async () => {
    await createWithBreadcrumb({ apiUrl: 'https://attacker.example.com' });
    const requestsBeforeClaim = stub.requests.length;

    const exitCode = await keylessClaim({ cwd, secretKey: 'sk_test_secret' });

    expect(exitCode).toBe(0);
    expect(stub.requests).toHaveLength(requestsBeforeClaim);
    expect(open).toHaveBeenCalledWith(created.claimUrl);
  });

  it('exits 3 when /me reports the environment was claimed', async () => {
    stub.respond('GET /v1/keyless/environments/me', {
      status: 401,
      body: { statusCode: 401, code: 'keyless_environment_claimed', message: 'claimed' },
    });

    const exitCode = await keylessClaim({ apiUrl: stub.apiUrl, cwd, secretKey: 'sk_test_secret' });

    expect(exitCode).toBe(3);
    expect(open).not.toHaveBeenCalled();
  });

  it('exits 4 when the breadcrumb has expired', async () => {
    await createWithBreadcrumb({ expiresAt: '2000-01-01T00:00:00.000Z' });

    const exitCode = await keylessClaim({ cwd });

    expect(exitCode).toBe(4);
    expect(open).not.toHaveBeenCalled();
  });

  it('exits 1 when there is no keyless environment to claim', async () => {
    const exitCode = await keylessClaim({ cwd });

    expect(exitCode).toBe(1);
    expect(stderr.join('\n')).toContain('novu keyless create');
  });
});
