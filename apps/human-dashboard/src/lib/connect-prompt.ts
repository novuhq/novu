import { INSTALL_SKILLS_COMMAND } from './onboarding';

/** How people run the CLI (`CLI_COMMAND` in `packages/agentinbox`): through npx, with nothing installed first. */
const CLI = 'npx @agentinbox/cli';

export type ConnectDetails = {
  /** The agent, as `connect` names it: its address before the `@`. */
  handle: string;
  /** The one-time code that lets a host connect as this agent. */
  code: string;
  /** The API the account lives on. `connect` always names it. */
  apiUrl: string;
};

/**
 * What the person runs in their terminal to connect with a one-time code, in order. The connect box lists
 * them. `--yes` lets `connect` replace a setup already on the computer instead of asking: the commands are
 * pasted together, and a question would take the next line as its answer. Only `connect` names the API:
 * it saves it, and the commands after it go there by themselves. It names it even when it's the CLI's
 * default, since the CLI prefers `INBOX_API_URL` or an API saved by an earlier setup over its default, and
 * a code works only on the API that made it.
 */
export function connectCommands({ handle, code, apiUrl }: ConnectDetails) {
  return [
    { label: 'Connect:', command: `${CLI} connect ${handle} --code ${code} --yes --api-url=${apiUrl}` },
    { label: 'Add the skills:', command: INSTALL_SKILLS_COMMAND },
    { label: 'Check it works:', command: `${CLI} inbox list` },
  ];
}
