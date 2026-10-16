// Where a box runs, as the CLI's commands see it: a local Docker container (docker.ts) or a Cloudflare box (cloud.ts).

import { Context, type Effect } from 'effect';
import type { CliError } from './run.ts';

export interface UpOptions {
  // Cloud: redeploy the host (a change to docker/box) before starting the box.
  readonly deploy?: boolean;
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
  readonly up: (options: UpOptions) => Effect.Effect<number, CliError>;
  readonly down: Effect.Effect<number, CliError>;
  readonly delete: Effect.Effect<number, CliError>;
  // Fails unless the box can take commands (a cloud box is woken first and waited for).
  readonly ready: Effect.Effect<void, CliError>;
  // One of the box's own commands (src/box/main.ts), its output on ours; its exit code.
  readonly box: (args: ReadonlyArray<string>, options?: BoxCall) => Effect.Effect<number, CliError>;
  // The same, its output collected; fails unless it exits 0.
  readonly boxOutput: (args: ReadonlyArray<string>, options?: BoxCall) => Effect.Effect<string, CliError>;
  // A command in the box's checkout (/data/novu).
  readonly exec: (cmd: ReadonlyArray<string>) => Effect.Effect<number, CliError>;
  readonly put: (file: string, path: string) => Effect.Effect<void, CliError>;
}

export class BoxTarget extends Context.Service<BoxTarget, Target>()('cli/BoxTarget') {}
