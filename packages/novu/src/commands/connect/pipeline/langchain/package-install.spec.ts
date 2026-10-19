import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { resolveLangChainPackageStatus, resolveLangChainPackagesToInstall } from './package-install';

describe('resolveLangChainPackagesToInstall', () => {
  it('suggests @novu/framework, langchain and @langchain/core when all are missing', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'novu-langchain-pkg-'));
    fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name: 'x', dependencies: {} }));

    expect(resolveLangChainPackagesToInstall(dir)).toEqual([
      '@novu/framework',
      'langchain@^1.0.0',
      '@langchain/core@^1.0.0',
    ]);
  });

  it('suggests only langchain packages when framework is already installed', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'novu-langchain-pkg-'));
    fs.writeFileSync(
      path.join(dir, 'package.json'),
      JSON.stringify({ name: 'x', dependencies: { '@novu/framework': 'latest' } })
    );

    expect(resolveLangChainPackagesToInstall(dir)).toEqual(['langchain@^1.0.0', '@langchain/core@^1.0.0']);
  });

  it('reports ok when all packages are present', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'novu-langchain-pkg-'));
    fs.writeFileSync(
      path.join(dir, 'package.json'),
      JSON.stringify({
        name: 'x',
        dependencies: {
          '@novu/framework': 'latest',
          langchain: '^1.0.0',
          '@langchain/core': '^1.0.0',
        },
      })
    );

    expect(resolveLangChainPackagesToInstall(dir)).toEqual([]);
    expect(resolveLangChainPackageStatus(dir)).toEqual({ kind: 'ok' });
  });
});
