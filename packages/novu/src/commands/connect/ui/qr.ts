import QRCode from 'qrcode';

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
