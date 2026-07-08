import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { resolveAiSdkPackagesToInstall } from './package-install';

describe('resolveAiSdkPackagesToInstall', () => {
  it('suggests @novu/framework and ai when both are missing', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'novu-ai-sdk-pkg-'));
    fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name: 'x', dependencies: {} }));

    expect(resolveAiSdkPackagesToInstall(dir)).toEqual(['@novu/framework', 'ai']);
  });

  it('suggests only ai when framework is already installed', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'novu-ai-sdk-pkg-'));
    fs.writeFileSync(
      path.join(dir, 'package.json'),
      JSON.stringify({ name: 'x', dependencies: { '@novu/framework': 'latest' } })
    );

    expect(resolveAiSdkPackagesToInstall(dir)).toEqual(['ai']);
  });
});
