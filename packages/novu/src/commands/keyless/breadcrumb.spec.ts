import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { type KeylessBreadcrumb, readKeylessBreadcrumb, writeKeylessBreadcrumb } from './breadcrumb';

const breadcrumb: KeylessBreadcrumb = {
  environmentId: 'env_1',
  applicationIdentifier: 'App1',
  apiUrl: 'https://api.novu.co',
  claimUrl: 'https://dashboard.novu.co/connect/claim?token=nvct_1',
  expiresAt: '2026-10-17T20:16:00.000Z',
  createdAt: '2026-10-14T20:16:00.000Z',
};

let cwd: string;

beforeEach(() => {
  cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'novu-breadcrumb-'));
});

afterEach(() => {
  fs.rmSync(cwd, { recursive: true, force: true });
});

describe('keyless breadcrumb', () => {
  it('round-trips through .novu/keyless.json', () => {
    writeKeylessBreadcrumb(cwd, breadcrumb);

    expect(readKeylessBreadcrumb(cwd)).toEqual(breadcrumb);
  });

  it('returns null when there is no breadcrumb or it is not valid JSON', () => {
    expect(readKeylessBreadcrumb(cwd)).toBeNull();

    fs.mkdirSync(path.join(cwd, '.novu'));
    fs.writeFileSync(path.join(cwd, '.novu', 'keyless.json'), '{not json');

    expect(readKeylessBreadcrumb(cwd)).toBeNull();
  });

  it('appends .novu/ to an existing .gitignore once', () => {
    fs.writeFileSync(path.join(cwd, '.gitignore'), 'node_modules');

    writeKeylessBreadcrumb(cwd, breadcrumb);
    writeKeylessBreadcrumb(cwd, breadcrumb);

    expect(fs.readFileSync(path.join(cwd, '.gitignore'), 'utf8')).toBe('node_modules\n.novu/\n');
  });

  it('leaves a .gitignore that already ignores .novu untouched and does not create one', () => {
    fs.writeFileSync(path.join(cwd, '.gitignore'), '.novu\n');
    writeKeylessBreadcrumb(cwd, breadcrumb);
    expect(fs.readFileSync(path.join(cwd, '.gitignore'), 'utf8')).toBe('.novu\n');

    const bare = fs.mkdtempSync(path.join(os.tmpdir(), 'novu-breadcrumb-bare-'));
    writeKeylessBreadcrumb(bare, breadcrumb);
    expect(fs.existsSync(path.join(bare, '.gitignore'))).toBe(false);
    fs.rmSync(bare, { recursive: true, force: true });
  });
});
