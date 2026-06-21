import type { CommandParser } from '../../core/types.js';

export type ConnectFlags = {
  keyless: boolean;
  secretKey: boolean;
  ci: boolean;
  channel?: string;
  description?: string;
  slackConfigToken?: string;
};

export function isConnectCommand(command: string): boolean {
  return /\bnovu(@[\w.-]+)?\s+connect\b/.test(command) || /\bnpx\s+[^\s]*novu[^\s]*\s+connect\b/.test(command);
}

/** Flags that consume the following token as their value (so it is not a positional). */
const VALUE_FLAGS = new Set(['--channel', '--slack-config-token', '--secret-key', '--api-url', '--dashboard-url']);

/**
 * Split a command into shell words, honoring single quotes, double quotes, and backslash
 * escapes (including the `'\''` idiom agents use to embed apostrophes). Quotes are stripped
 * from the decoded words, so `--channel "slack"` yields `['--channel', 'slack']` rather than
 * leaving the quotes attached to the value.
 */
function tokenizeShellWords(input: string): string[] {
  const words: string[] = [];
  let i = 0;

  while (i < input.length) {
    while (i < input.length && /\s/.test(input[i])) {
      i += 1;
    }

    if (i >= input.length) {
      break;
    }

    let word = '';

    while (i < input.length && !/\s/.test(input[i])) {
      const ch = input[i];

      if (ch === "'") {
        i += 1;
        while (i < input.length && input[i] !== "'") {
          word += input[i];
          i += 1;
        }
        i += 1;
      } else if (ch === '"') {
        i += 1;
        while (i < input.length && input[i] !== '"') {
          if (input[i] === '\\' && i + 1 < input.length) {
            i += 1;
          }
          word += input[i];
          i += 1;
        }
        i += 1;
      } else if (ch === '\\') {
        if (i + 1 < input.length) {
          word += input[i + 1];
          i += 2;
        } else {
          i += 1;
        }
      } else {
        word += ch;
        i += 1;
      }
    }

    words.push(word);
  }

  return words;
}

/** Read a flag's value, supporting both `--flag value` and `--flag=value` forms. */
function readFlagValue(tokens: string[], flag: string): string | undefined {
  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];

    if (token === flag) {
      return tokens[i + 1];
    }

    if (token.startsWith(`${flag}=`)) {
      return token.slice(flag.length + 1);
    }
  }

  return undefined;
}

/**
 * Find the first positional argument after `connect` — i.e. the first token that is not a
 * flag and is not consumed as a value-flag's value. This matches the playbook command no
 * matter where the quoted description sits (e.g. `connect "Desc" --ci` or
 * `connect --ci --channel slack "Desc"`).
 */
function findConnectPositional(tokens: string[]): string | undefined {
  const connectIndex = tokens.indexOf('connect');

  if (connectIndex === -1) {
    return undefined;
  }

  let skipNext = false;

  for (let i = connectIndex + 1; i < tokens.length; i += 1) {
    const token = tokens[i];

    if (skipNext) {
      skipNext = false;
      continue;
    }

    if (token.startsWith('-')) {
      if (VALUE_FLAGS.has(token)) {
        skipNext = true;
      }

      continue;
    }

    return token;
  }

  return undefined;
}

function resolveDescription(command: string, tokens: string[], env: Record<string, string>): string | undefined {
  const exportMatch = command.match(/export\s+NOVU_AGENT_DESCRIPTION=(.+)/);

  if (exportMatch?.[1]) {
    const [value] = tokenizeShellWords(exportMatch[1].trimStart());

    if (value && !value.includes('$')) {
      return value;
    }
  }

  const positional = findConnectPositional(tokens);

  // A positional that references the env var (e.g. "$NOVU_AGENT_DESCRIPTION") resolves from env.
  if (positional && !positional.includes('$')) {
    return positional;
  }

  return env.NOVU_AGENT_DESCRIPTION;
}

export const connectParser: CommandParser<ConnectFlags> = {
  matches: isConnectCommand,
  parse(command, env) {
    const tokens = tokenizeShellWords(command);

    const flags: ConnectFlags = {
      keyless: /--keyless\b/.test(command),
      secretKey: /--secret-key\b/.test(command) || /\bNOVU_SECRET_KEY=/.test(command),
      ci: /--ci\b/.test(command),
    };

    flags.channel = readFlagValue(tokens, '--channel');
    flags.slackConfigToken = readFlagValue(tokens, '--slack-config-token');
    flags.description = resolveDescription(command, tokens, env);

    return flags;
  },
};

export type ConnectValidationOptions = {
  /** Keyless flow: the connect command must pass `--keyless` (the default for this flow). */
  requireKeyless?: boolean;
  /** Dashboard OAuth flow: the connect command must omit `--keyless` (the CLI default path). */
  requireNoKeyless?: boolean;
  allowedChannels?: string[];
};

export function connectValidate(options: ConnectValidationOptions): (flags: ConnectFlags) => string | null {
  return (flags) => {
    if (options.requireKeyless && !flags.keyless) {
      return 'Expected --keyless flag for this scenario.';
    }

    if (options.requireNoKeyless && flags.keyless) {
      return 'Did not expect --keyless flag for this scenario (use dashboard OAuth by omitting it).';
    }

    if (flags.secretKey) {
      return 'Must not pass --secret-key in guided onboarding flow.';
    }

    if (options.allowedChannels?.length) {
      if (!flags.channel) {
        return `Expected --channel flag (one of: ${options.allowedChannels.join(', ')}).`;
      }

      if (!options.allowedChannels.includes(flags.channel)) {
        return `Unexpected channel "${flags.channel}". Expected one of: ${options.allowedChannels.join(', ')}.`;
      }
    }

    if (!flags.ci) {
      return 'Expected --ci flag.';
    }

    return null;
  };
}
