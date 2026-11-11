import { type Host, type HostId, hostOf } from '@/lib/hosts';
import { NPX_CLI } from '@/lib/onboarding';

/**
 * How the agent says hi, by the way its host came in: a chat app signed in (ChatGPT, Claude, Grok Bot), a coding
 * or server agent through its plugin or MCP, any of them through the CLI and its one-time code, or an app Agent
 * Inbox doesn't know (Other, through MCP).
 */
export type SayHiWay = 'chat' | 'mcp' | 'cli' | 'other';

/** What the operator pastes into their agent: it only asks, so no setting of the host's stands in its way. */
export const SAY_HI_PROMPT = 'Introduce yourself and share your agent card.';

/** What the operator runs where the agent's commands run, after a CLI connection. */
export const CARD_COMMAND = `${NPX_CLI} card`;

export function sayHiWayOf(hostId: HostId, via: 'cli' | 'mcp' | null): SayHiWay {
  if (via === 'cli') {
    return 'cli';
  }
  if (hostId === 'general') {
    return 'other';
  }

  return hostOf(hostId).group === 'chat' ? 'chat' : 'mcp';
}

/** "Sid is connected to ChatGPT." Other apps aren't named: "Sid is connected." */
export function connectedTitle(name: string, host: Host, way: SayHiWay): string {
  return way === 'other' ? `${name} is connected.` : `${name} is connected to ${host.name}.`;
}

/** The line under the title of A.4a: what to do, and where the agent answers. */
export function sayHiLead(name: string, host: Host, way: SayHiWay): string {
  switch (way) {
    case 'cli':
      return `Run this in a terminal where ${host.id === 'general' ? 'your agent' : host.name} runs. ${name} says hi right there.`;
    case 'other':
      return `Ask ${name} to introduce itself. It replies right where you ask.`;
    default:
      return `Ask ${name} to introduce itself. It replies right there in ${host.name}.`;
  }
}

/** The line in the box while the page waits for the card. */
export function waitingLine(name: string, host: Host, way: SayHiWay): string {
  switch (way) {
    case 'cli':
      return `Waiting for ${name} to say hi in your terminal…`;
    case 'other':
      return `Waiting for ${name} to say hi…`;
    default:
      return `Waiting for ${name} to say hi in ${host.name}…`;
  }
}

/** A.4's title once the card was shown. */
export function saidHiTitle(name: string, host: Host, way: SayHiWay): string {
  switch (way) {
    case 'cli':
      return `${name} said hi in your terminal.`;
    case 'other':
      return `${name} said hi.`;
    default:
      return `${name} said hi in ${host.name}.`;
  }
}

/** A.4's line under the title. */
export function saidHiLead(name: string, host: Host, way: SayHiWay): string {
  const where =
    way === 'chat' || way === 'other'
      ? 'Its card is in your chat.'
      : way === 'cli'
        ? 'Its card is in your terminal.'
        : `Its card is in ${host.name}.`;

  return `${where} People can now email or message ${name} directly.`;
}

/** What the agent says as it shows its card, as the API says it for the tool and the command. */
export function greetingOf(name: string, operatorFirstName: string | null): string {
  const hello = operatorFirstName ? `Hi ${operatorFirstName}, I’m ${name}.` : `Hi, I’m ${name}.`;

  return `${hello} I have my own inbox now. Here’s my card, so people can email or message me directly.`;
}
