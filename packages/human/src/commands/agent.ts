import pc from 'picocolors';
import { loadPicture } from '../agent-picture';
import {
  getHumanAgent,
  type HumanAgent,
  removeHumanAgentPicture,
  setHumanAgentPicture,
  updateHumanAgent,
} from '../api/human';
import { clientFromConfig, handleError } from './interact';

export interface AgentOptions {
  name?: string;
  /** An empty string clears the description. */
  description?: string;
  /** A JPEG or PNG: a file on this computer or a web address. */
  picture?: string;
  removePicture?: boolean;
  json?: boolean;
  apiUrl?: string;
}

/** Matches Novu `AGENT_NAME_MAX_LENGTH` and the API's description limit. The CLI cannot import `@novu/shared`. */
export const AGENT_NAME_MAX_LENGTH = 60;
export const AGENT_DESCRIPTION_MAX_LENGTH = 512;

/** What `--name` and `--description` ask to change, checked before anything is sent. */
export function parseAgentChanges(options: Pick<AgentOptions, 'name' | 'description'>): {
  name?: string;
  description?: string;
} {
  const name = options.name?.trim();
  const description = options.description?.trim();

  if (options.name !== undefined && !name) {
    throw new Error('--name cannot be empty.');
  }

  if (name && name.length > AGENT_NAME_MAX_LENGTH) {
    throw new Error(`--name must be ${AGENT_NAME_MAX_LENGTH} characters or fewer.`);
  }

  if (description && description.length > AGENT_DESCRIPTION_MAX_LENGTH) {
    throw new Error(`--description must be ${AGENT_DESCRIPTION_MAX_LENGTH} characters or fewer.`);
  }

  return {
    ...(name ? { name } : {}),
    ...(description !== undefined ? { description } : {}),
  };
}

export function renderAgent(agent: HumanAgent): string {
  const description = agent.description ?? pc.dim('— (add one: human agent --description "...")');

  const picture = agent.pictureUrl ?? pc.dim('— (add one: human agent --picture ./avatar.png)');

  return `Name:        ${pc.bold(agent.name)}\nDescription: ${description}\nPicture:     ${picture}\n`;
}

export async function agentCommand(options: AgentOptions): Promise<never> {
  let output: string;
  try {
    output = await runAgent(options);
  } catch (err) {
    return handleError(err);
  }

  process.stdout.write(output);
  process.exit(0);
}

async function runAgent(options: AgentOptions): Promise<string> {
  const changes = parseAgentChanges(options);
  if (options.picture !== undefined && options.removePicture) {
    throw new Error('Pass --picture or --remove-picture, not both.');
  }

  // Read before anything is saved, so a wrong file changes nothing.
  const picture = options.picture !== undefined ? await loadPicture(options.picture) : undefined;
  const { client, config } = clientFromConfig(options.apiUrl);
  const changing = Object.keys(changes).length > 0 || picture !== undefined || Boolean(options.removePicture);

  let agent = Object.keys(changes).length
    ? await updateHumanAgent(client, { agentIdentifier: config.relayAgentIdentifier, ...changes })
    : undefined;

  if (picture) {
    agent = await setHumanAgentPicture(client, picture);
  } else if (options.removePicture) {
    agent = await removeHumanAgentPicture(client);
  }

  agent ??= await getHumanAgent(client);

  if (options.json) {
    return `${JSON.stringify(agent, null, 2)}\n`;
  }

  if (!changing) {
    return renderAgent(agent);
  }

  // A Slack app keeps the name and icon it was made with: only Slack's own settings page can change them.
  return (
    `${pc.green('✔')} Saved.\n${renderAgent(agent)}` +
    `${pc.dim('People see it on the invite page, in emails and on your Telegram bot. A Slack app keeps its name and icon: change them in its Slack settings.')}\n`
  );
}
