export interface Token {
  type: 'bold' | 'italic' | 'text';
  content: string;
}

type FormatState = 'text' | 'bold' | 'italic';

export const parseMarkdownIntoTokens = (text: string): Token[] => {
  const tokens: Token[] = [];
  let buffer = '';
  let state: FormatState = 'text';

  for (let i = 0; i < text.length; i += 1) {
    if (text[i] === '\\' && text[i + 1] === '*') {
      buffer += '*';
      i += 1;
    } else if (text[i] === '*' && text[i + 1] === '*') {
      if (buffer) {
        tokens.push({ type: state, content: buffer });
        buffer = '';
      }
      state = state === 'bold' ? 'text' : 'bold';
      i += 1;
    } else if (text[i] === '*' && text[i + 1] !== '*' && (i === 0 || text[i - 1] !== '*')) {
      if (buffer) {
        tokens.push({ type: state, content: buffer });
        buffer = '';
      }
      state = state === 'italic' ? 'text' : 'italic';
    } else {
      buffer += text[i];
    }
  }

  if (buffer) {
    tokens.push({ type: state, content: buffer });
  }

  return tokens;
};
