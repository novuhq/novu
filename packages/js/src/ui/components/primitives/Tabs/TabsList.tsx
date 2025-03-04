/* eslint-disable local-rules/no-class-without-style */
import { JSX, ParentProps, Ref, splitProps } from 'solid-js';
import { cn, useStyle } from '../../../helpers';
import type { AppearanceKey } from '../../../types';

export const tabsListVariants = () => 'nt-flex nt-gap-6';

type TabsListProps = JSX.IntrinsicElements['div'] &
  ParentProps & { class?: string; appearanceKey?: AppearanceKey; ref?: Ref<HTMLDivElement> };

export const TabsList = (props: TabsListProps) => {
  const [local, rest] = splitProps(props, ['class', 'appearanceKey', 'ref', 'children']);
  const style = useStyle();

  return (
    <>
      <div
        ref={local.ref}
        class={style(local.appearanceKey || 'tabsList', cn(tabsListVariants(), local.class))}
        role="tablist"
        {...rest}
      >
        {local.children}
      </div>
      <div class="nt-relative nt-z-[-1]" />
    </>
  );
};
