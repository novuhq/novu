import { createMemo, For, JSX, splitProps } from 'solid-js';
import { markdownStyles } from '../../core/style/tables';
import { cn, useStyle } from '../../helpers';
import { parseMarkdownIntoTokens } from '../../internal';
import { AllAppearanceKey } from '../../types';

const Bold = (props: { children?: JSX.Element; appearanceKey?: AllAppearanceKey }) => {
  const style = useStyle();

  return (
    <strong
      class={style({
        key: props.appearanceKey || markdownStyles.strong.key,
        className: markdownStyles.strong.className,
      })}
    >
      {props.children}
    </strong>
  );
};

const Italic = (props: { children?: JSX.Element; appearanceKey?: AllAppearanceKey }) => {
  const style = useStyle();

  return (
    <em
      class={style({
        key: props.appearanceKey || markdownStyles.em.key,
        className: markdownStyles.em.className,
      })}
    >
      {props.children}
    </em>
  );
};

const Text = (props: { children?: JSX.Element }) => props.children;

type MarkdownProps = JSX.HTMLAttributes<HTMLParagraphElement> & {
  appearanceKey: AllAppearanceKey;
  strongAppearanceKey: AllAppearanceKey;
  emAppearanceKey?: AllAppearanceKey;
  children: string;
  context?: Record<string, unknown>;
};
const Markdown = (props: MarkdownProps) => {
  const [local, rest] = splitProps(props, [
    'class',
    'children',
    'appearanceKey',
    'strongAppearanceKey',
    'emAppearanceKey',
    'context',
  ]);
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
          if (token.type === 'boldItalic') {
            return (
              <Bold appearanceKey={local.strongAppearanceKey}>
                <Italic appearanceKey={local.emAppearanceKey}>{token.content}</Italic>
              </Bold>
            );
          } else if (token.type === 'bold') {
            return <Bold appearanceKey={local.strongAppearanceKey}>{token.content}</Bold>;
          } else if (token.type === 'italic') {
            return <Italic appearanceKey={local.emAppearanceKey}>{token.content}</Italic>;
          } else {
            return <Text>{token.content}</Text>;
          }
        }}
      </For>
    </p>
  );
};

export default Markdown;
