import { createMemo, For, JSX, splitProps } from 'solid-js';
import { cn, useStyle } from '../../helpers';
import { parseMarkdownIntoTokens } from '../../internal';
import { AppearanceKey } from '../../types';

const Bold = (props: { children?: JSX.Element; appearanceKey?: AppearanceKey }) => {
  const style = useStyle();

  return (
    <strong
      class={style({
        key: props.appearanceKey || 'strong',
        className: 'nt-font-semibold',
      })}
    >
      {props.children}
    </strong>
  );
};
const Text = (props: { children?: JSX.Element }) => props.children;

type MarkdownProps = JSX.HTMLAttributes<HTMLParagraphElement> & {
  appearanceKey: AppearanceKey;
  strongAppearanceKey: AppearanceKey;
  children: string;
  context?: Record<string, unknown>;
};
const Markdown = (props: MarkdownProps) => {
  const [local, rest] = splitProps(props, ['class', 'children', 'appearanceKey', 'strongAppearanceKey', 'context']);
  const style = useStyle();

  const tokens = createMemo(() => parseMarkdownIntoTokens(local.children));

  return (
    <p
      class={style({
        key: local.appearanceKey,
        className: cn(local.class),
        context: local.context,
      })}
      {...rest}
    >
      <For each={tokens()}>
        {(token) => {
          if (token.type === 'bold') {
            return <Bold appearanceKey={local.strongAppearanceKey}>{token.content}</Bold>;
          } else {
            return <Text>{token.content}</Text>;
          }
        }}
      </For>
    </p>
  );
};

export default Markdown;
