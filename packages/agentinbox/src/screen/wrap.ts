import { charWidth } from './terminal';

/** A run of styled text, split into what shows and the escapes between. */
type Token = { style: string } | { char: string; width: number };

const ESCAPE = /\x1b\[[0-?]*[ -/]*[@-~]|\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)/y;
const RESET = /^\x1b\[0?m$/;
const SGR = /^\x1b\[[0-9;]*m$/;

/** A word, the spaces before it, and how wide it is. */
interface Word {
  tokens: Token[];
  width: number;
  gap: number;
}

/**
 * `text` as lines no wider than `width`, broken at spaces, and inside a word only where the word alone is
 * wider than a line. A new line in `text` always starts a new one. Colours and styles carry over a break:
 * they are closed at the end of a line and opened again at the start of the next, so every line can be
 * written, or rewritten, on its own.
 */
export function wrapStyled(text: string, width: number): string[] {
  const room = Math.max(1, width);
  const lines = text.split('\n').flatMap((paragraph) => breakParagraph(tokenize(paragraph), room));

  return carryStyles(lines);
}

function tokenize(text: string): Token[] {
  const tokens: Token[] = [];
  let at = 0;

  while (at < text.length) {
    ESCAPE.lastIndex = at;
    const sequence = ESCAPE.exec(text);
    if (sequence) {
      tokens.push({ style: sequence[0] });
      at += sequence[0].length;
      continue;
    }

    const char = String.fromCodePoint(text.codePointAt(at) ?? 0);
    tokens.push({ char, width: charWidth(char.codePointAt(0) ?? 0) });
    at += char.length;
  }

  return tokens;
}

function toWords(tokens: Token[]): Word[] {
  const words: Word[] = [];
  let word: Word = { tokens: [], width: 0, gap: 0 };

  for (const token of tokens) {
    if ('char' in token && token.char === ' ') {
      if (word.tokens.some((part) => 'char' in part)) {
        words.push(word);
        word = { tokens: [], width: 0, gap: 0 };
      }
      word.gap += 1;
      continue;
    }

    word.tokens.push(token);
    if ('char' in token) {
      word.width += token.width;
    }
  }
  words.push(word);

  return words;
}

function breakParagraph(tokens: Token[], room: number): Token[][] {
  const lines: Token[][] = [];
  let line: Token[] = [];
  let used = 0;

  const newLine = () => {
    lines.push(line);
    line = [];
    used = 0;
  };

  for (const [index, word] of toWords(tokens).entries()) {
    // Spaces are kept at the start of the text, and dropped where a line breaks.
    let gap = used > 0 || index === 0 ? word.gap : 0;
    if (used > 0 && used + gap + word.width > room) {
      newLine();
      gap = 0;
    }

    for (let space = 0; space < gap && used < room; space += 1) {
      line.push({ char: ' ', width: 1 });
      used += 1;
    }

    for (const token of word.tokens) {
      if ('char' in token) {
        if (used > 0 && used + token.width > room) {
          newLine();
        }
        used += token.width;
      }
      line.push(token);
    }
  }
  lines.push(line);

  return lines;
}

function carryStyles(lines: Token[][]): string[] {
  let open: string[] = [];

  return lines.map((tokens) => {
    let text = open.join('');

    for (const token of tokens) {
      if ('char' in token) {
        text += token.char;
        continue;
      }

      text += token.style;
      if (RESET.test(token.style)) {
        open = [];
      } else if (SGR.test(token.style)) {
        open.push(token.style);
      }
    }

    return open.length > 0 ? `${text}\x1b[0m` : text;
  });
}
