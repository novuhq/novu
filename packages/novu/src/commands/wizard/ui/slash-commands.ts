export interface SlashCommand {
  name: string;
  description: string;
  hint?: string;
}

export const SLASH_COMMANDS: SlashCommand[] = [
  { name: '/help', description: 'show keybindings + commands' },
  { name: '/exit', description: 'end the session' },
  { name: '/clear', description: 'clear the transcript' },
  { name: '/copy', description: 'copy the last assistant message to clipboard' },
  { name: '/diff', description: 'show all diffs from this session' },
  { name: '/skills', description: 'list installed Novu skills' },
  { name: '/errors', description: 'open the session errors panel' },
  { name: '/tools', description: 'open the session tool-calls panel' },
  { name: '/model', description: 'switch the assistant model', hint: '/model <id>' },
];

export function matchSlashCommands(input: string): SlashCommand[] {
  if (!input.startsWith('/')) return [];
  const lower = input.toLowerCase();

  return SLASH_COMMANDS.filter((cmd) => cmd.name.startsWith(lower));
}
