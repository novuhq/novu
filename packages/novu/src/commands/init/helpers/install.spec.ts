import { describe, expect, it } from 'vitest';
import { buildInstallArgs, formatNpmInstallCommand, NPM_INSTALL_DISPLAY_FLAGS } from './install';

describe('buildInstallArgs', () => {
  it('adds npm flags that prevent post-install audit hangs', () => {
    expect(buildInstallArgs('npm', [], true)).toEqual([
      'install',
      '--no-workspaces',
      '--no-audit',
      '--fund=false',
    ]);
  });

  it('appends offline for npm when not online', () => {
    expect(buildInstallArgs('npm', ['react'], false)).toEqual([
      'install',
      'react',
      '--no-workspaces',
      '--no-audit',
      '--fund=false',
      '--offline',
    ]);
  });
});

describe('formatNpmInstallCommand', () => {
  it('matches buildInstallArgs npm flags for display strings', () => {
    expect(formatNpmInstallCommand(['@novu/react', '@assistant-ui/react'])).toBe(
      `npm install @novu/react @assistant-ui/react ${NPM_INSTALL_DISPLAY_FLAGS}`
    );
  });
});
