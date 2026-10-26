import { CSI, rowsOf } from './terminal';

/** Lets the terminal show a whole frame at once, where it can; others ignore it. */
export const BEGIN_FRAME = `${CSI}?2026h`;
export const END_FRAME = `${CSI}?2026l`;
export const HIDE_CURSOR = `${CSI}?25l`;
export const SHOW_CURSOR = `${CSI}?25h`;

/**
 * What to write to turn the lines on the terminal, `previous`, into `next`, with the cursor at the start of
 * the line below them before and after. Only the lines that changed are written again; the others are
 * stepped over. A line that takes another number of rows than before moves everything below it, so from
 * there on everything is written again. Rows left over below a shorter frame are cleared. Nothing changed
 * writes nothing.
 *
 * The rows a line takes are counted for a terminal `columns` wide, so a line the terminal wraps, such as a
 * long link, is stepped over whole.
 */
export function repaint(previous: readonly string[], next: readonly string[], columns: number): string {
  if (previous.length === next.length && previous.every((line, index) => line === next[index])) {
    return '';
  }

  const heights = previous.map((line) => rowsOf(line, columns));
  const height = heights.reduce((sum, rows) => sum + rows, 0);
  let text = height > 0 ? `${CSI}${height}F` : '';
  let index = 0;

  for (; index < Math.min(previous.length, next.length); index += 1) {
    if (previous[index] === next[index]) {
      text += `${CSI}${heights[index]}E`;
      continue;
    }

    const rows = rowsOf(next[index], columns);
    if (rows !== heights[index]) {
      break;
    }

    // Each row the line takes is cleared, before the line is written over them again.
    text += `${CSI}2K${`${CSI}1E${CSI}2K`.repeat(rows - 1)}${rows > 1 ? `${CSI}${rows - 1}F` : ''}${next[index]}\n`;
  }

  if (index < next.length || next.length < previous.length) {
    text += `${CSI}J${next
      .slice(index)
      .map((line) => `${line}\n`)
      .join('')}`;
  }

  return `${BEGIN_FRAME}${text}${END_FRAME}`;
}
