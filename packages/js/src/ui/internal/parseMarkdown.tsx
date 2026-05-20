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

export const parseMarkdownIntoTokens = (text: string): Token[] => {
  const tokens: Token[] = [];
  let buffer = '';
  let isBold = false;
  let isItalic = false;
  let lastDoubleAsteriskEnd = -2;

  for (let i = 0; i < text.length; i += 1) {
    if (text[i] === '\\' && text[i + 1] === '*') {
      buffer += '*';
      i += 1;
    } else if (text[i] === '*' && text[i + 1] === '*') {
      if (buffer) {
        tokens.push({ type: getTokenType(isBold, isItalic), content: buffer });
        buffer = '';
      }
      isBold = !isBold;
      lastDoubleAsteriskEnd = i + 1;
      i += 1;
    } else if (text[i] === '*') {
      const prevIsStar = i > 0 && text[i - 1] === '*';
      const prevWasConsumed = lastDoubleAsteriskEnd === i - 1;

      if (prevIsStar && !prevWasConsumed) {
        buffer += text[i];
      } else {
        if (buffer) {
          tokens.push({ type: getTokenType(isBold, isItalic), content: buffer });
          buffer = '';
        }
        isItalic = !isItalic;
      }
    } else {
      buffer += text[i];
    }
  }

  if (buffer) {
    tokens.push({ type: getTokenType(isBold, isItalic), content: buffer });
  }

  return tokens;
};
