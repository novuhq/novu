export interface Token {
  type: 'bold' | 'italic' | 'boldItalic' | 'text';
  content: string;
}

function getTokenType(isBold: boolean, isItalic: boolean): Token['type'] {
  if (isBold && isItalic) return 'boldItalic';
  if (isBold) return 'bold';
  if (isItalic) return 'italic';

  return 'text';
}

function isDoubleDelimiter(char: string, text: string, index: number): boolean {
  return text[index] === char && text[index + 1] === char;
}

function isDelimiter(char: string): boolean {
  return char === '*' || char === '_';
}

function isWordChar(char: string | undefined): boolean {
  return !!char && /[A-Za-z0-9]/.test(char);
}

function canUseUnderscoreDelimiter(text: string, index: number, isDouble: boolean): boolean {
  const prev = text[index - 1];
  const next = text[index + (isDouble ? 2 : 1)];

  return !isWordChar(prev) && !isWordChar(next);
}

export const parseMarkdownIntoTokens = (text: string): Token[] => {
  const tokens: Token[] = [];
  let buffer = '';
  let isBold = false;
  let isItalic = false;
  let lastDoubleDelimiterEnd = -2;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];

    if (char === '\\' && isDelimiter(text[i + 1])) {
      buffer += text[i + 1];
      i += 1;
      continue;
    }

    if (
      isDelimiter(char) &&
      isDoubleDelimiter(char, text, i) &&
      (char !== '_' || canUseUnderscoreDelimiter(text, i, true))
    ) {
      if (buffer) {
        tokens.push({ type: getTokenType(isBold, isItalic), content: buffer });
        buffer = '';
      }
      isBold = !isBold;
      lastDoubleDelimiterEnd = i + 1;
      i += 1;
      continue;
    }

    if (isDelimiter(char) && (char !== '_' || canUseUnderscoreDelimiter(text, i, false))) {
      const prevIsDelimiter = i > 0 && isDelimiter(text[i - 1]);
      const prevWasConsumed = lastDoubleDelimiterEnd === i - 1;

      if (prevIsDelimiter && !prevWasConsumed) {
        buffer += char;
        continue;
      }

      if (buffer) {
        tokens.push({ type: getTokenType(isBold, isItalic), content: buffer });
        buffer = '';
      }
      isItalic = !isItalic;
      continue;
    }

    buffer += char;
  }

  if (buffer) {
    tokens.push({ type: getTokenType(isBold, isItalic), content: buffer });
  }

  return tokens;
};
