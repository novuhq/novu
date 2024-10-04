export interface Token {
  type: 'bold' | 'text';
  content: string;
}

export const parseMarkdownIntoTokens = (text: string): Token[] => {
  const tokens: Token[] = [];
  let buffer = '';
  let inBold = false;

  for (let i = 0; i < text.length; i += 1) {
    // Check if it's an escaped character
    if (text[i] === '\\' && text[i + 1] === '*') {
      buffer += '*';
      i += 1;
    }
    // Check for bold marker **
    else if (text[i] === '*' && text[i + 1] === '*') {
      if (buffer) {
        tokens.push({ type: inBold ? 'bold' : 'text', content: buffer });
        buffer = '';
      }
      inBold = !inBold;
      i += 1;
    } else {
      buffer += text[i];
    }
  }

  // Push any remaining buffered text as a token
  if (buffer) {
    tokens.push({ type: inBold ? 'bold' : 'text', content: buffer });
  }

  return tokens;
};
