import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { resolveAiSdkPackageStatus, resolveAiSdkPackagesToInstall } from './package-install';

describe('resolveAiSdkPackagesToInstall', () => {
  it('suggests @novu/framework and ai when both are missing', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'novu-ai-sdk-pkg-'));
    fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name: 'x', dependencies: {} }));

    expect(resolveAiSdkPackagesToInstall(dir)).toEqual(['@novu/framework', 'ai@^7.0.0']);
  });

  it('suggests only ai when framework is already installed', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'novu-ai-sdk-pkg-'));
    fs.writeFileSync(
      path.join(dir, 'package.json'),
      JSON.stringify({ name: 'x', dependencies: { '@novu/framework': 'latest' } })
    );

    expect(resolveAiSdkPackagesToInstall(dir)).toEqual(['ai@^7.0.0']);
  });

  it('does not suggest ai when an incompatible v6 range is already declared', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'novu-ai-sdk-pkg-'));
    fs.writeFileSync(
      path.join(dir, 'package.json'),
      JSON.stringify({
        name: 'x',
        dependencies: {
          '@novu/framework': 'latest',
          ai: '^6.0.0',
        },
      })
    );

    expect(resolveAiSdkPackagesToInstall(dir)).toEqual([]);
    expect(resolveAiSdkPackageStatus(dir)).toEqual({
      kind: 'incompatible-ai',
      declaredVersion: '^6.0.0',
    });
  });
});
