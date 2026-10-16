import { type ParseArgsOptionsConfig, parseArgs } from 'node:util';

export interface Parsed {
  readonly args: ReadonlyArray<string>;
  flag(name: string): boolean;
  option(name: string): string | undefined;
}

export interface Command {
  // After the command's name: its arguments and flags.
  readonly usage: string;
  readonly help: string;
  readonly options?: ParseArgsOptionsConfig;
  readonly run: (parsed: Parsed) => Promise<number | undefined>;
}

export function help(program: string, commands: Readonly<Record<string, Command>>, notes = ''): string {
  const usages = Object.entries(commands).map(([name, command]) => `${program} ${name} ${command.usage}`.trimEnd());
  const width = Math.max(...usages.map((usage) => usage.length)) + 2;
  const lines = Object.values(commands).map(
    (command, index) => `  ${usages[index]?.padEnd(width)}${command.help.replaceAll('\n', `\n  ${' '.repeat(width)}`)}`
  );

  return `usage:\n${lines.join('\n')}${notes && `\n\n${notes}`}`;
}

// Runs the command `argv` names; help (exit 0 if asked for, 1 if the command is unknown) otherwise.
export function runCommand(
  program: string,
  commands: Readonly<Record<string, Command>>,
  { argv = process.argv.slice(2), notes = '' }: { argv?: ReadonlyArray<string>; notes?: string } = {}
): Promise<number | undefined> {
  const [name = '', ...rest] = argv;
  const command = Object.hasOwn(commands, name) ? commands[name] : undefined;
  const own = rest.includes('--') ? rest.slice(0, rest.indexOf('--')) : rest;
  if (!command || own.includes('--help')) {
    console.log(help(program, commands, notes));

    return Promise.resolve(command || ['', 'help', '--help', '-h'].includes(name) ? 0 : 1);
  }
  const { values, positionals } = parseArgs({
    args: [...rest],
    options: command.options ?? {},
    allowPositionals: true,
  });

  return command.run({
    args: positionals,
    flag: (flag) => values[flag] === true,
    option: (option) => {
      const value = values[option];

      return typeof value === 'string' ? value : undefined;
    },
  });
}
