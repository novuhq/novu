import pc from 'picocolors';
import {
  isLookColor,
  isMascotBody,
  LOOK_COLORS,
  type LookColor,
  MASCOT_BODIES,
  type MascotBody,
  type MascotLook,
} from '../../mascot/look';
import { openedScreen, type ScreenRow } from '../../screen/screen';
import type { SetupOptions } from './operator';
import type { SetupIo } from './prompts';

/**
 * The look of a new agent: the shape and colour of its mascot, which nothing changes afterwards. `--agent-shape`
 * and `--agent-color` say it, and so does a person at a terminal, who is asked once the API says a look can be
 * picked. They pick with the arrow keys, and the mascot on the screen bends into each one they move to.
 */

/** The look every agent has until one is picked for it: the round orange mascot. */
const ORIGINAL: MascotLook = { shape: 'orb', color: 'ember' };

const BODY_QUESTION = 'Shape: ';
const COLOR_QUESTION = 'Color: ';

/** `orb, pebble, drop, bean, peek or mochi` */
function listed(names: readonly string[]): string {
  return `${names.slice(0, -1).join(', ')} or ${names[names.length - 1]}`;
}

/** `Drop`, as the dashboard's pickers name it. */
function labelOf(name: string): string {
  return `${name[0].toUpperCase()}${name.slice(1)}`;
}

/** The row a pick leaves on the screen: `Shape: Drop`. */
function keptAs(question: string, name: string): ScreenRow {
  return { mark: 'done', value: `${question.trim()} ${pc.bold(labelOf(name))}` };
}

/**
 * The look `--agent-shape` and `--agent-color` ask for, or nothing when neither was passed. One alone is enough:
 * the API takes the other from the original look. A value that is neither a shape nor a colour stops the setup,
 * with the ones there are.
 */
export function passedLook(options: Pick<SetupOptions, 'agentShape' | 'agentColor'>): Partial<MascotLook> | undefined {
  const body = options.agentShape?.trim().toLowerCase();
  const color = options.agentColor?.trim().toLowerCase();

  if (body !== undefined && !isMascotBody(body)) {
    throw new Error(`--agent-shape takes ${listed(MASCOT_BODIES)}.`);
  }
  if (color !== undefined && !isLookColor(color)) {
    throw new Error(`--agent-color takes ${listed(LOOK_COLORS)}.`);
  }

  return body === undefined && color === undefined
    ? undefined
    : { ...(body ? { shape: body } : {}), ...(color ? { color } : {}) };
}

/** What was asked for, with the original look's shape or colour where one was left out, as the API fills it in. */
export function completedLook(asked: Partial<MascotLook>): MascotLook {
  return { ...ORIGINAL, ...asked };
}

/**
 * Asks a person for their agent's shape and colour, each picked with the arrow keys from the ones there are.
 * Both start on the round orange mascot, which Enter keeps, so nobody has to pick. Nothing comes back for that
 * one: it is the look every agent has anyway.
 */
export async function chooseLook(io: SetupIo): Promise<MascotLook | undefined> {
  io.write("Give your agent a look: the shape and colour of its mascot. A look can't be changed later.\n");

  const show = (look: MascotLook) => openedScreen()?.look(look);
  const body = await io.pick<MascotBody>(BODY_QUESTION, {
    choices: MASCOT_BODIES,
    initial: ORIGINAL.shape,
    label: labelOf,
    onMove: (moved) => show({ shape: moved, color: ORIGINAL.color }),
    remember: (kept) => keptAs(BODY_QUESTION, kept),
  });
  const color = await io.pick<LookColor>(COLOR_QUESTION, {
    choices: LOOK_COLORS,
    initial: ORIGINAL.color,
    label: labelOf,
    onMove: (moved) => show({ shape: body, color: moved }),
    remember: (kept) => keptAs(COLOR_QUESTION, kept),
  });
  const look: MascotLook = { shape: body, color };
  // Where a pick was typed nothing showed it on the way, and the mascot still ends up in what was picked.
  show(look);

  return body === ORIGINAL.shape && color === ORIGINAL.color ? undefined : look;
}
