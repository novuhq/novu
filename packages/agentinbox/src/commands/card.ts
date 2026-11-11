import pc from 'picocolors';
import { type ShownCard, showCard } from '../api/card';
import { isLookColor, isMascotBody, type LookColor, type MascotBody } from '../mascot/look';
import { stripTerminalControls } from '../output';
import { renderQR } from '../qr';
import { openScreen, type ScreenRow } from '../screen/screen';
import { failOnScreen } from './failure';
import { clientFromConfig, handleError } from './interact';

export interface CardOptions {
  json?: boolean;
  apiUrl?: string;
}

/** Where the plain output is printed and whether it is a terminal, which decides whether the QR code is worth it. */
export interface CardIo {
  write: (text: string) => void;
  isTTY: boolean;
}

/**
 * `agentinbox card`: the agent says hi and shows its card, its name, address and link, with a QR code of the link
 * on a terminal. At a terminal it is drawn on the screen with the mascot in the agent's own look. It is what the
 * operator runs once a host is connected through the CLI, and it works any time after.
 */
export async function cardCommand(options: CardOptions): Promise<never> {
  try {
    const { client, config } = clientFromConfig(options.apiUrl);
    const card = await showCard(client, config.relayAgentIdentifier);

    if (options.json) {
      process.stdout.write(`${JSON.stringify(card, null, 2)}\n`);
      process.exit(0);
    }

    const screen = await openScreen({ command: 'card', handle: card.handle, look: lookOf(card) });
    if (!screen) {
      printCard(card, { write: (text) => process.stdout.write(text), isTTY: Boolean(process.stdout.isTTY) });
      process.exit(0);
    }

    try {
      screen.subtitle(stripTerminalControls(card.greeting));
      screen.rows(cardRows(card));
      if (card.url) {
        screen.figure(renderQR(card.url).split('\n'));
      }
      await screen.done('happy');
    } catch (err) {
      await failOnScreen(screen, err);
      throw err;
    }

    process.exit(0);
  } catch (err) {
    handleError(err);
  }
}

/** The card's lines on the screen: its name, address and link, the link kept whole to be clicked or copied. */
export function cardRows(shown: ShownCard): ScreenRow[] {
  const card = terminalSafe(shown);

  return [
    { mark: 'done', label: 'Name', value: pc.bold(card.name) },
    ...(card.address ? [{ mark: 'done' as const, label: 'Email', value: card.address }] : []),
    ...(card.url ? [{ mark: 'next' as const, label: 'Card', value: pc.underline(card.url), whole: true }] : []),
  ];
}

/**
 * The card as plain text, where there is no screen: a pipe, CI, or an agent running the command. A QR code is
 * only printed for a person at a terminal; an agent passes the link on instead.
 */
export function printCard(shown: ShownCard, io: CardIo): void {
  const card = terminalSafe(shown);
  const lines = [
    card.greeting,
    '',
    `  ${pc.bold(card.name)}`,
    ...(card.address ? [`  ${card.address}`] : []),
    ...(card.url ? [`  ${card.url}`] : []),
  ];
  const qr = card.url && io.isTTY ? `\n${renderQR(card.url)}\n` : '';

  io.write(`${lines.join('\n')}\n${qr}`);
}

/** The card's shown fields come from the API, so they must not be able to drive the operator's terminal. */
function terminalSafe(card: ShownCard): ShownCard {
  return {
    ...card,
    greeting: stripTerminalControls(card.greeting),
    name: stripTerminalControls(card.name),
    address: card.address === undefined ? undefined : stripTerminalControls(card.address),
    url: card.url === undefined ? undefined : stripTerminalControls(card.url),
  };
}

/** The mascot's body and colour from the card, or none for a look this CLI doesn't know yet: the orb in ember. */
function lookOf(card: ShownCard): { shape: MascotBody; color: LookColor } | undefined {
  const body = card.look?.shape;
  const color = card.look?.color;

  return isMascotBody(body) && isLookColor(color) ? { shape: body, color } : undefined;
}
