import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { upsertEnvFile } from './env-file';

let dir: string;
let file: string;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'novu-env-file-'));
  file = path.join(dir, '.env');
});

afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

describe('upsertEnvFile', () => {
  it('creates the file when it does not exist', () => {
    upsertEnvFile(file, { NOVU_SECRET_KEY: 'sk_1', NOVU_API_URL: 'https://api.novu.co' });

    expect(fs.readFileSync(file, 'utf8')).toBe('NOVU_SECRET_KEY=sk_1\nNOVU_API_URL=https://api.novu.co\n');
  });

  it('replaces existing keys in place and keeps unrelated lines', () => {
    fs.writeFileSync(file, '# comment\nOTHER=1\nNOVU_SECRET_KEY=old\nexport NOVU_API_URL=old');

    upsertEnvFile(file, {
      NOVU_SECRET_KEY: 'sk_2',
      NOVU_API_URL: 'https://eu.api.novu.co',
      NOVU_APPLICATION_IDENTIFIER: 'App',
    });

    expect(fs.readFileSync(file, 'utf8')).toBe(
      '# comment\nOTHER=1\nNOVU_SECRET_KEY=sk_2\nNOVU_API_URL=https://eu.api.novu.co\nNOVU_APPLICATION_IDENTIFIER=App\n'
    );
  });
});
