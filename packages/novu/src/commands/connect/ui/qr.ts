import { randomBytes } from 'node:crypto';
import { chmod } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import QRCode from 'qrcode';

/**
 * Render a QR code to a PNG file in the OS temp directory and return its
 * absolute path.
 *
 * Used in `--ci` / logging mode where the consumer is an AI agent driving a
 * chat UI: ASCII QR art breaks there (code blocks add line-height gaps that
 * slice the modules, and dark themes invert the polarity), while a PNG path
 * can be embedded inline as a markdown image.
 */
export async function renderQRPngFile(text: string): Promise<string> {
  const filePath = join(tmpdir(), `novu-connect-qr-${randomBytes(6).toString('hex')}.png`);
  await QRCode.toFile(filePath, text, { type: 'png', width: 480, margin: 2 });
  await chmod(filePath, 0o600);

  return filePath;
}

/**
 * Half-block ASCII QR for terminal rendering.
 *
 * Half-blocks (`▀ ▄ █`) give square modules on 2:1 terminal cells and scan
 * reliably on phones — denser glyph packings (braille, quadrant blocks) often fail.
 */
export async function renderQR(text: string, errorCorrectionLevel: 'L' | 'M' | 'Q' | 'H' = 'L'): Promise<string> {
  const qr = QRCode.create(text, { errorCorrectionLevel });
  const { data, size } = qr.modules;

  const QUIET = 2;
  const total = size + QUIET * 2;
  const paddedH = total + (total % 2);

  const isDark = (col: number, row: number): boolean => {
    const c = col - QUIET;
    const r = row - QUIET;
    if (c < 0 || c >= size || r < 0 || r >= size) return false;

    return data[r * size + c] === 1;
  };

  const lines: string[] = [];
  for (let row = 0; row < paddedH; row += 2) {
    let line = '';
    for (let col = 0; col < total; col++) {
      const top = isDark(col, row);
      const bot = isDark(col, row + 1);
      if (top && bot) line += '█';
      else if (top) line += '▀';
      else if (bot) line += '▄';
      else line += ' ';
    }
    lines.push(line);
  }

  return lines.join('\n');
}
