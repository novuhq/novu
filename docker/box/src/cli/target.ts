
import { output } from '../node/process.ts';

export interface UpOptions {
  readonly from?: string | undefined;
  readonly fromBase?: boolean;
  readonly ref?: string;
}

export interface BoxCall {
  readonly github?: boolean;
}

export interface Target {
  readonly name: string;
  readonly mailUrl: string;
  readonly up: (options: UpOptions) => Promise<number>;
  readonly down: () => Promise<number>;
  readonly delete: () => Promise<number>;
  readonly ready: () => Promise<void>;
  readonly box: (args: ReadonlyArray<string>, options?: BoxCall) => Promise<number>;
  readonly boxOutput: (args: ReadonlyArray<string>, options?: BoxCall) => Promise<string>;
  readonly exec: (cmd: ReadonlyArray<string>) => Promise<number>;
  readonly put: (file: string, path: string) => Promise<void>;
}

let token: Promise<string> | undefined;

export function githubToken(): Promise<string> {
  token ??= process.env.GITHUB_TOKEN
    ? Promise.resolve(process.env.GITHUB_TOKEN)
    : output('gh', ['auth', 'token']).catch(() => {
        throw new Error('needs GITHUB_TOKEN or a signed-in `gh` (gh auth login)');
      });

  return token;
}

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
