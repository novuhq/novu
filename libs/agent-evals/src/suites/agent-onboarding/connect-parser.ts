import type { CommandParser } from '../../core/types.js';

export type ConnectFlags = {
  login: boolean;
  secretKey: boolean;
  ci: boolean;
  channel?: string;
  description?: string;
  slackConfigToken?: string;
};

export function isConnectCommand(command: string): boolean {
  return /\bnovu(@[\w.-]+)?\s+connect\b/.test(command) || /\bnpx\s+[^\s]*novu[^\s]*\s+connect\b/.test(command);
}

/**
 * Decode a single shell word, honoring single quotes, double quotes, and backslash
 * escapes (including the `'\''` idiom agents use to embed apostrophes). Reading stops
 * at the first unquoted whitespace so trailing flags are not absorbed into the value.
 */
function unquoteShellWord(input: string): string {
  let out = '';
  let i = 0;

  while (i < input.length) {
    const ch = input[i];

    if (ch === "'") {
      i += 1;
      while (i < input.length && input[i] !== "'") {
        out += input[i];
        i += 1;
      }
      i += 1;
    } else if (ch === '"') {
      i += 1;
      while (i < input.length && input[i] !== '"') {
        if (input[i] === '\\' && i + 1 < input.length) {
          i += 1;
        }
        out += input[i];
        i += 1;
      }
      i += 1;
    } else if (ch === '\\') {
      if (i + 1 < input.length) {
        out += input[i + 1];
        i += 2;
      } else {
        i += 1;
      }
    } else if (/\s/.test(ch)) {
      break;
    } else {
      out += ch;
      i += 1;
    }
  }

  return out;
}

function resolveDescription(command: string, env: Record<string, string>): string | undefined {
  const exportMatch = command.match(/export\s+NOVU_AGENT_DESCRIPTION=(.+)/);

  if (exportMatch?.[1]) {
    const value = unquoteShellWord(exportMatch[1].trimStart());

    if (value && !value.includes('$')) {
      return value;
    }
  }

  // Only treat a quoted token as the positional description; a leading flag means there is none.
  const positionalMatch = command.match(/\bconnect\s+(['"][\s\S]*)/);

  if (positionalMatch?.[1]) {
    const positional = unquoteShellWord(positionalMatch[1]);

    // A positional that references the env var (e.g. "$NOVU_AGENT_DESCRIPTION") resolves from env.
    if (positional && !positional.includes('$')) {
      return positional;
    }
  }

  return env.NOVU_AGENT_DESCRIPTION;
}

export const connectParser: CommandParser<ConnectFlags> = {
  matches: isConnectCommand,
  parse(command, env) {
    const flags: ConnectFlags = {
      login: /--login\b/.test(command),
      secretKey: /--secret-key\b/.test(command) || /\bNOVU_SECRET_KEY=/.test(command),
      ci: /--ci\b/.test(command),
    };

    const channelMatch = command.match(/--channel\s+(\S+)/);
    if (channelMatch) {
      flags.channel = channelMatch[1];
    }

    const slackTokenMatch = command.match(/--slack-config-token\s+(\S+)/);
    if (slackTokenMatch) {
      flags.slackConfigToken = slackTokenMatch[1];
    }

    flags.description = resolveDescription(command, env);

    return flags;
  },
};

export type ConnectValidationOptions = {
  requireLogin?: boolean;
  requireNoLogin?: boolean;
  allowedChannels?: string[];
};

export function connectValidate(options: ConnectValidationOptions): (flags: ConnectFlags) => string | null {
  return (flags) => {
    if (options.requireLogin && !flags.login) {
      return 'Expected --login flag for this scenario.';
    }

    if (options.requireNoLogin && flags.login) {
      return 'Did not expect --login flag for this scenario.';
    }

    if (flags.secretKey) {
      return 'Must not pass --secret-key in guided onboarding flow.';
    }

    if (options.allowedChannels?.length && flags.channel && !options.allowedChannels.includes(flags.channel)) {
      return `Unexpected channel "${flags.channel}". Expected one of: ${options.allowedChannels.join(', ')}.`;
    }

    if (!flags.ci) {
      return 'Expected --ci flag.';
    }

    return null;
  };
}
