import { charWidth } from './terminal';

/**
 * A terminal in memory, for tests: it takes what a program writes and keeps the text a person would see.
 * It knows what the screen writes (moving the cursor by lines, erasing, wrapping long lines, scrolling) and
 * leaves colours out.
 */
export class VirtualTerminal {
  /** Every line, scrolled away or not; each a row of characters, and whether it carries on the row before. */
  private readonly lines: Array<{ chars: string[]; wrapped: boolean }> = [{ chars: [], wrapped: false }];
  private row = 0;
  private column = 0;
  /** The first line on screen. */
  private top = 0;

  constructor(
    readonly columns: number,
    readonly rows: number
  ) {}

  write(text: string): void {
    for (let at = 0; at < text.length; ) {
      const sequence = /^\x1b\[([0-?]*)([ -/]*)([@-~])|^\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)/.exec(text.slice(at));
      if (sequence) {
        if (sequence[3]) {
          this.control(sequence[1], sequence[3]);
        }
        at += sequence[0].length;
        continue;
      }

      const char = String.fromCodePoint(text.codePointAt(at) ?? 0);
      at += char.length;
      this.put(char);
    }
  }

  /** What is on screen now, a line a row, without trailing spaces. */
  screen(): string[] {
    return this.lines.slice(this.top, this.top + this.rows).map((line) => line.chars.join('').trimEnd());
  }

  /** Everything, scrolled away or not, with the rows the terminal wrapped joined back into their lines. */
  text(): string {
    return this.lines
      .map((line) => `${line.wrapped ? '' : '\n'}${line.chars.join('').trimEnd()}`)
      .join('')
      .trim();
  }

  private line(index: number) {
    while (this.lines.length <= index) {
      this.lines.push({ chars: [], wrapped: false });
    }

    return this.lines[index];
  }

  private down(wrapped: boolean) {
    this.row += 1;
    this.line(this.row).wrapped = wrapped;
    if (this.row >= this.top + this.rows) {
      this.top = this.row - this.rows + 1;
    }
  }

  private put(char: string) {
    if (char === '\n') {
      this.down(false);
      this.column = 0;

      return;
    }
    if (char === '\r') {
      this.column = 0;

      return;
    }

    const width = charWidth(char.codePointAt(0) ?? 0);
    if (this.column + width > this.columns) {
      this.down(true);
      this.column = 0;
    }

    const { chars } = this.line(this.row);
    while (chars.length < this.column) {
      chars.push(' ');
    }
    chars[this.column] = char;
    this.column += width;
  }

  private control(parameters: string, command: string) {
    const count = Number(parameters.replace('?', '') || 1);

    switch (command) {
      case 'F':
      case 'A':
        this.row = Math.max(this.top, this.row - count);
        if (command === 'F') {
          this.column = 0;
        }
        break;
      case 'E':
      case 'B':
        this.row = Math.min(this.top + this.rows - 1, this.row + count);
        this.line(this.row);
        if (command === 'E') {
          this.column = 0;
        }
        break;
      case 'K': {
        const { chars } = this.line(this.row);
        if (parameters === '2') {
          chars.length = 0;
        } else {
          chars.length = Math.min(chars.length, this.column);
        }
        break;
      }
      case 'J':
        this.line(this.row).chars.length = Math.min(this.line(this.row).chars.length, this.column);
        this.lines.length = this.row + 1;
        break;
      default:
        // Colours, styles, the cursor's visibility and synchronized output change nothing that shows as text.
        break;
    }
  }
}
