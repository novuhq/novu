import sharp from 'sharp';
import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { LOOK_COLORS, MASCOT_BODIES } from './look';
import {
  allMascotPictures,
  MASCOT_PICTURE_SIZE,
  mascotPictureName,
  mascotPictureOf,
  renderMascotPicture,
} from './mascot-picture';

/** The colour of one pixel of a picture, as `#rrggbb`. */
async function pixelAt(picture: Buffer, x: number, y: number): Promise<string> {
  const { data, info } = await sharp(picture).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const offset = (y * info.width + x) * info.channels;

  return `#${[data[offset], data[offset + 1], data[offset + 2]].map((part) => part.toString(16).padStart(2, '0')).join('')}`;
}

describe('mascot pictures', () => {
  it('has one for every body in every colour, as a PNG and as a JPEG', () => {
    const names = allMascotPictures().map(mascotPictureName);

    expect(names).toHaveLength(MASCOT_BODIES.length * LOOK_COLORS.length * 2);
    expect(new Set(names).size).toBe(names.length);
    expect(names).toContain('orb-ember.png');
    expect(names).toContain('drop-coral.jpg');
  });

  it('finds the picture a file name asks for, and none for any other name', () => {
    expect(mascotPictureOf('drop-coral.png')).toEqual({ body: 'drop', color: 'coral', format: 'png' });
    expect(mascotPictureOf('mochi-bone.jpg')).toEqual({ body: 'mochi', color: 'bone', format: 'jpg' });

    for (const name of [
      'cube-coral.png',
      'drop-coral.gif',
      'drop-coral',
      'coral-drop.png',
      '../agent-avatar.png',
      '',
    ]) {
      expect(mascotPictureOf(name)).toBeNull();
    }
  });

  it('draws a square PNG on the default picture’s background, big enough for a Slack icon', async () => {
    const picture = await renderMascotPicture({ body: 'drop', color: 'coral', format: 'png' });
    const { width, height, format } = await sharp(picture).metadata();

    expect({ width, height, format }).toEqual({
      width: MASCOT_PICTURE_SIZE,
      height: MASCOT_PICTURE_SIZE,
      format: 'png',
    });
    expect(MASCOT_PICTURE_SIZE).toBeGreaterThanOrEqual(512);
    expect(await pixelAt(picture, 4, 4)).toBe('#0b0c0e');
    // The middle of the picture is the mascot, in one of its own tones.
    expect(await pixelAt(picture, 600, 560)).not.toBe('#0b0c0e');
  });

  it('draws the same mascot as a JPEG, the one kind of picture a Telegram bot takes', async () => {
    const picture = await renderMascotPicture({ body: 'drop', color: 'coral', format: 'jpg' });
    const { width, height, format } = await sharp(picture).metadata();

    expect({ width, height, format }).toEqual({
      width: MASCOT_PICTURE_SIZE,
      height: MASCOT_PICTURE_SIZE,
      format: 'jpeg',
    });
  });

  it('draws each look differently', async () => {
    const [orb, drop, bone] = await Promise.all([
      renderMascotPicture({ body: 'orb', color: 'ember', format: 'png' }),
      renderMascotPicture({ body: 'drop', color: 'ember', format: 'png' }),
      renderMascotPicture({ body: 'orb', color: 'bone', format: 'png' }),
    ]);

    expect(orb.equals(drop)).toBe(false);
    expect(orb.equals(bone)).toBe(false);
  });

  it('keeps a PNG small, as the default picture is', async () => {
    const picture = await renderMascotPicture({ body: 'peek', color: 'peach', format: 'png' });

    expect(picture.byteLength).toBeLessThan(40_000);
  });
});
