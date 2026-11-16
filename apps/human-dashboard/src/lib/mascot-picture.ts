import 'server-only';

import sharp from 'sharp';

import { LOOK_COLORS, type LookColor, MASCOT_BODIES, type MascotBody } from './look';
import { AVATAR_RADIUS, drawMascot, formOf, MASCOT_AT_REST } from './mascot-sphere';

/**
 * The mascot as a channel shows it for an agent with no picture of its own: in the agent's look, awake and
 * looking straight ahead, on the near-black of `public/brand/agent-avatar.png`, the one picture every agent had
 * before looks. There is one for every body and colour, at `/brand/mascot/{body}-{color}.png` for emails and Slack
 * apps and `.jpg` for Telegram bots, which take nothing else (the API's `mascotPictureUrl`).
 *
 * They are drawn by the code that draws the mascot on the page (`drawMascot`, as the design's `Avatar v2`), so a
 * channel's mascot can't drift from the dashboard's. A change to the drawing changes these pictures at their
 * addresses, and channels keep what they loaded: an email client its copy, a bot and a Slack app the file they
 * were given.
 */

/** The side of a picture in pixels: Slack takes no icon under 512, and the default picture has always been this. */
export const MASCOT_PICTURE_SIZE = 1200;

/** The grid the mascot is drawn on, the design's own, each cell ten pixels of the picture. */
const GRID = 120;

/** The background of the default picture, which these stand in for. */
const BACKGROUND = '#0b0c0e';

export const MASCOT_PICTURE_FORMATS = ['png', 'jpg'] as const;

export type MascotPictureFormat = (typeof MASCOT_PICTURE_FORMATS)[number];

export type MascotPicture = { body: MascotBody; color: LookColor; format: MascotPictureFormat };

export const MASCOT_PICTURE_TYPES: Record<MascotPictureFormat, string> = { png: 'image/png', jpg: 'image/jpeg' };

/** The file name of a picture, the last part of its address: `drop-coral.png`. */
export function mascotPictureName({ body, color, format }: MascotPicture): string {
  return `${body}-${color}.${format}`;
}

/** Every picture there is: each body in each colour, in both formats. */
export function allMascotPictures(): MascotPicture[] {
  return MASCOT_BODIES.flatMap((body) =>
    LOOK_COLORS.flatMap((color) => MASCOT_PICTURE_FORMATS.map((format) => ({ body, color, format })))
  );
}

/** The picture a file name asks for, or `null` for a name that is none of them. */
export function mascotPictureOf(name: string): MascotPicture | null {
  return allMascotPictures().find((picture) => mascotPictureName(picture) === name) ?? null;
}

/** Draws the picture: the mascot's grid scaled up cell by cell, so its dots stay crisp, on the background. */
export async function renderMascotPicture({ body, color, format }: MascotPicture): Promise<Buffer> {
  const pixels = new Uint8ClampedArray(GRID * GRID * 4);
  drawMascot(pixels, GRID, MASCOT_AT_REST, AVATAR_RADIUS, 'awake', { avatar: true }, formOf(body, color));

  const mascot = await sharp(Buffer.from(pixels.buffer), { raw: { width: GRID, height: GRID, channels: 4 } })
    .resize(MASCOT_PICTURE_SIZE, MASCOT_PICTURE_SIZE, { kernel: 'nearest' })
    .png()
    .toBuffer();
  const picture = sharp({
    create: { width: MASCOT_PICTURE_SIZE, height: MASCOT_PICTURE_SIZE, channels: 3, background: BACKGROUND },
  }).composite([{ input: mascot }]);

  // A handful of flat colours: a palette keeps the PNG to a few kilobytes, as the default picture is.
  return format === 'png'
    ? picture.png({ palette: true, compressionLevel: 9 }).toBuffer()
    : picture.jpeg({ quality: 90, chromaSubsampling: '4:4:4' }).toBuffer();
}
