import * as path from 'path';
import { describe, expect, it } from 'vitest';
import { getBundlerConfig } from './config';

describe('getBundlerConfig', () => {
  it('should normalize wildcard aliases and resolve relative targets from rootDir', () => {
    const rootDir = '/tmp/novu-project';

    const config = getBundlerConfig({
      rootDir,
      minify: false,
      aliases: {
        '@/*': './src/*',
        '@emails/*': './emails/*',
        '@core/': './core/',
      },
    });

    expect(config.alias).toEqual({
      '@': path.resolve(rootDir, './src'),
      '@emails': path.resolve(rootDir, './emails'),
      '@core': path.resolve(rootDir, './core'),
    });
  });

  it('should preserve absolute alias targets', () => {
    const rootDir = '/tmp/novu-project';
    const absoluteTarget = '/tmp/shared';

    const config = getBundlerConfig({
      rootDir,
      aliases: {
        '@shared': absoluteTarget,
      },
    });

    expect(config.alias).toEqual({
      '@shared': absoluteTarget,
    });
  });

  it('should not include alias option when aliases are not provided', () => {
    const config = getBundlerConfig({
      rootDir: '/tmp/novu-project',
    });

    expect(config.alias).toBeUndefined();
  });
});
