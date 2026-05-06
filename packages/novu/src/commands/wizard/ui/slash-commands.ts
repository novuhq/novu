import { Overlay } from './store';

export interface SlashCommand {
  name: string;
  description: string;
  overlay: Overlay;
}

export const SLASH_COMMANDS: SlashCommand[] = [
  { name: '/activity', description: 'open the live activity trail (read-only)', overlay: Overlay.Chat },
  { name: '/help', description: 'show keybindings + commands', overlay: Overlay.Help },
  { name: '/errors', description: 'open the session errors panel', overlay: Overlay.Errors },
];

export function matchSlashCommands(input: string): SlashCommand[] {
  if (!input.startsWith('/')) return [];
  const lower = input.toLowerCase();

  return SLASH_COMMANDS.filter((cmd) => cmd.name.startsWith(lower));
}

export function findSlashCommand(name: string): SlashCommand | undefined {
  return SLASH_COMMANDS.find((cmd) => cmd.name === name);
}
