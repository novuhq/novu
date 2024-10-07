import { createMemo, For, JSX } from 'solid-js';
import { useStyle } from '../../helpers';
import { parseMarkdownIntoTokens } from '../../internal';
import { AppearanceKey } from '../../types';

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
