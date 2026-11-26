import { codexHookAnswer } from '../listen/codex-folder';

export interface ContactCheckCommandOptions {
  host: string;
}

/**
 * `agentinbox contact-check --host codex`: the check a host runs before each tool call of a contact's run, which the
 * listener sets up (Codex's `PreToolUse` hook). It reads the call on its input and writes a refusal, or nothing to let
 * the host go on, by what the folder's own settings allow (`codex-folder.ts`). Anything that goes wrong is a refusal.
 */
export async function contactCheckCommand(options: ContactCheckCommandOptions): Promise<never> {
  if (options.host !== 'codex') {
    // Codex reads a hook that stops with 2 as a refusal, with these words as its reason.
    process.stderr.write(`There is no check for ${options.host} here.\n`);
    process.exit(2);
  }

  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
  }
  process.stdout.write(await codexHookAnswer(Buffer.concat(chunks).toString('utf8'), process.env));
  process.exit(0);
}
