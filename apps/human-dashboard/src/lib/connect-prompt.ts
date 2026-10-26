import { type CommandHost, skillsCommand } from './hosts';
import { INSTALL_SKILLS_COMMAND, NPX_CLI } from './onboarding';

export type ConnectDetails = {
  /** The agent, as `connect` names it: its address before the `@`. */
  handle: string;
  /** The one-time code that lets a host connect as this agent. */
  code: string;
  /**
   * The API the account lives on. The dashboard always names it; a public host page, which has no account
   * and so no code, leaves it out.
   */
  apiUrl?: string;
};

export type ConnectCommand = { label: string; command: string };

/**
 * What the person runs in their terminal to connect with a one-time code, in order. The connect box lists
 * them. `--yes` lets `connect` replace a setup already on the computer instead of asking: the commands are
 * pasted together, and a question would take the next line as its answer. Only `connect` names the API:
 * it saves it, and the commands after it go there by themselves. It names it even when it's the CLI's
 * default, since the CLI prefers `INBOX_API_URL` or an API saved by an earlier setup over its default, and
 * a code works only on the API that made it.
 *
 * The skills go to the host the commands are for (`skillsCommand`); without one, to every agent the skills
 * CLI finds in the project.
 */
export function connectCommands({ handle, code, apiUrl }: ConnectDetails, host?: CommandHost): ConnectCommand[] {
  const api = apiUrl ? ` --api-url=${apiUrl}` : '';

  return [
    { label: 'Connect', command: `${NPX_CLI} connect ${handle} --code ${code} --yes${api}` },
    { label: 'Add the skills', command: host ? skillsCommand(host) : INSTALL_SKILLS_COMMAND },
    { label: 'Check it works', command: `${NPX_CLI} inbox list` },
  ];
}
