// Where a box runs, as the CLI's commands see it: a local Docker container (docker.ts) or a Cloudflare box (cloud.ts).

import { output } from '../node/process.ts';

export interface UpOptions {
  // Cloud: the first start begins from that box's latest snapshot instead of a bake.
  readonly from?: string | undefined;
  // Cloud: a box that is new starts from `base`'s snapshot when there is one, else bakes.
  readonly fromBase?: boolean;
  readonly ref?: string;
}

export interface BoxCall {
  // GITHUB_TOKEN goes into that one command's environment, for the fetches that need it (a PR, the enterprise
  // submodule); it's never written into the box.
  readonly github?: boolean;
}

export interface Target {
  readonly name: string;
  readonly mailUrl: string;
  readonly up: (options: UpOptions) => Promise<number>;
  readonly down: () => Promise<number>;
  readonly delete: () => Promise<number>;
  // Fails unless the box can take commands (a cloud box is woken first and waited for).
  readonly ready: () => Promise<void>;
  // One of the box's own commands (src/box/main.ts), its output on ours; its exit code.
  readonly box: (args: ReadonlyArray<string>, options?: BoxCall) => Promise<number>;
  // The same, its output collected; fails unless it exits 0.
  readonly boxOutput: (args: ReadonlyArray<string>, options?: BoxCall) => Promise<string>;
  // A command in the box's checkout (/data/novu).
  readonly exec: (cmd: ReadonlyArray<string>) => Promise<number>;
  readonly put: (file: string, path: string) => Promise<void>;
}

let token: Promise<string> | undefined;

// The caller's GitHub token: GITHUB_TOKEN, else `gh auth token`.
export function githubToken(): Promise<string> {
  token ??= process.env.GITHUB_TOKEN
    ? Promise.resolve(process.env.GITHUB_TOKEN)
    : output('gh', ['auth', 'token']).catch(() => {
        throw new Error('needs GITHUB_TOKEN or a signed-in `gh` (gh auth login)');
      });

  return token;
}

// The current branch as a box name: lowercase letters, digits and dashes, short enough for a workers.dev name.
export async function branchBox(): Promise<string> {
  const name = (await output('git', ['branch', '--show-current']))
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50)
    .replace(/-$/, '');
  if (!name) throw new Error('not on a branch; pass --box <name>');

  return name;
}
