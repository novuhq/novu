import { createMemo, For, JSX } from 'solid-js';
import { useStyle } from '../../helpers';
import { AppearanceKey } from '../../types';

interface Token {
  type: 'bold' | 'text';
  content: string;
}

const parseMarkdownIntoTokens = (text: string): Token[] => {
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

const Bold = (props: { children?: JSX.Element; appearanceKey?: AppearanceKey }) => {
  const style = useStyle();

  return <strong class={style(props.appearanceKey || 'strong', 'nt-font-semibold')}>{props.children}</strong>;
};
const Text = (props: { children?: JSX.Element }) => props.children;

type MarkdownProps = JSX.HTMLAttributes<HTMLParagraphElement> & {
  strongAppearanceKey: AppearanceKey;
  children: string;
};
const Markdown = (props: MarkdownProps) => {
  const { children, strongAppearanceKey, ...rest } = props;

  const tokens = createMemo(() => parseMarkdownIntoTokens(children));

  return (
    <p {...rest}>
      <For each={tokens()}>
        {(token) => {
          if (token.type === 'bold') {
            return <Bold appearanceKey={strongAppearanceKey}>{token.content}</Bold>;
          } else {
            return <Text>{token.content}</Text>;
          }
        }}
      </For>
    </p>
  );
};

export default Markdown;
