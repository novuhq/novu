import { render } from 'ink';
import React from 'react';
import { App } from './app';
import type { MountInkAppParams, MountInkAppResult } from './types';

export async function mountInkApp(params: MountInkAppParams): Promise<MountInkAppResult> {
  return new Promise<MountInkAppResult>((resolve) => {
    let resolved: MountInkAppResult | null = null;

    const handleResolve = (value: MountInkAppResult) => {
      if (resolved) return;
      resolved = value;
    };

    const instance = render(<App {...params} onResolve={handleResolve} />, {
      patchConsole: false,
      exitOnCtrlC: false,
      alternateScreen: true,
    });

    void instance.waitUntilExit().then(() => {
      resolve(resolved ?? { exitCode: 0, summary: { totalMessages: 0, toolCalls: 0, errors: 0 } });
    });
  });
}

export type { MountInkAppParams, MountInkAppResult };
