import { type CliConfig, loadConfig, resolveTargetApiUrl, saveConfig } from './config';
import { lookOf, type MascotLook, sameLook } from './mascot/look';

/**
 * The agent's look, kept on this computer (`CliConfig.look`) so a command's screen can open with the agent's own
 * mascot. The API says how the agent looks in answers the CLI gets anyway (`connect`, `login`, `setup`, `listen`,
 * `card`), so it is never asked for the look alone. A look belongs to one agent: it is saved for the agent the
 * saved config acts as, and goes when the config moves to another agent, account or API.
 */

/** What says which agent a config acts as. */
type Connection = Pick<CliConfig, 'apiUrl' | 'auth' | 'relayAgentIdentifier'>;

/** Whether two configs act as the same agent: the one of that name, of the same account, on the same API. */
function actsAsSameAgent(saved: CliConfig, other: Connection): boolean {
  const sameAccount =
    saved.auth.mode === other.auth.mode &&
    (saved.auth.mode === 'apiKey'
      ? Boolean(saved.auth.secretKey) && saved.auth.secretKey === other.auth.secretKey
      : Boolean(saved.auth.keylessIdentifier) && saved.auth.keylessIdentifier === other.auth.keylessIdentifier);

  return (
    sameAccount &&
    saved.apiUrl.replace(/\/$/, '') === other.apiUrl.replace(/\/$/, '') &&
    saved.relayAgentIdentifier === other.relayAgentIdentifier
  );
}

/**
 * The look of the agent saved on this computer, for a command's screen to open in. None while the command is
 * headed for another API, another account or another agent than the saved one (`--api-url`, INBOX_API_URL, a key
 * of its own, `--agent-identifier`): the agent there isn't known until the API answers.
 */
export function savedLook(
  target: { apiUrl?: string; secretKey?: string; agentIdentifier?: string } = {}
): MascotLook | undefined {
  const saved = loadConfig();
  if (!saved || resolveTargetApiUrl(target.apiUrl, saved) !== saved.apiUrl.replace(/\/$/, '')) {
    return undefined;
  }

  if (target.agentIdentifier && target.agentIdentifier !== saved.relayAgentIdentifier) {
    return undefined;
  }

  const secretKey = target.secretKey ?? process.env.INBOX_SECRET_KEY?.trim();

  return secretKey && secretKey !== saved.auth.secretKey ? undefined : lookOf(saved.look);
}

/**
 * The look for a config that `setup`, `login` or `connect` writes anew, to spread into it: the one the API just
 * `answered`, else the saved one while the new config acts as the same agent as the `existing` one.
 */
export function lookToKeep(next: Connection, existing: CliConfig | null, answered: unknown): { look?: MascotLook } {
  const look = lookOf(answered) ?? (existing && actsAsSameAgent(existing, next) ? lookOf(existing.look) : undefined);

  return look ? { look } : {};
}

/**
 * Keeps the look an API answer carries, for the next command's screen to open in, and gives it back. It is saved
 * only for the agent the saved config acts as: an answer got with a key from the shell is another agent's. An
 * answer without a look, as an older API's is, changes nothing.
 *
 * Keeping it only helps the next screen, so a config that can't be written, such as a read-only one, never fails
 * the command that got the answer: `card` and `listen status` still print what they asked for.
 */
export function rememberLook(config: CliConfig, answered: unknown): MascotLook | undefined {
  const look = lookOf(answered);
  const saved = look ? loadConfig() : null;

  if (look && saved && actsAsSameAgent(saved, config) && !sameLook(lookOf(saved.look), look)) {
    try {
      saveConfig({ ...saved, look });
    } catch {
      // The next screen opens as the orb and bends into the look again.
    }
  }

  return look;
}
