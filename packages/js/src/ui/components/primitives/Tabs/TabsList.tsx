/* eslint-disable local-rules/no-class-without-style */
import { JSX, ParentProps, Ref, splitProps } from 'solid-js';
import type { AppearanceKey } from '../../../types';
import { useStyle } from '../../../helpers';

export const tabsListVariants = () => 'nt-flex nt-gap-6 nt-px-6 nt-py-1 nt-overflow-hidden';

type TabsListProps = JSX.IntrinsicElements['div'] &
  ParentProps & { class?: string; appearanceKey?: AppearanceKey; ref?: Ref<HTMLDivElement> };

export const TabsList = (props: TabsListProps) => {
  const [local, rest] = splitProps(props, ['class', 'appearanceKey', 'ref', 'children']);
  const style = useStyle();

  return (
    <>
      <div
        ref={local.ref}
        class={local.class ? local.class : style(local.appearanceKey || 'tabsList', tabsListVariants())}
        role="tablist"
        {...rest}
      >
        {local.children}
      </div>
      <div class="nt-border-t nt-border-secondary nt-mt-[-0.25rem] nt-relative nt-z-[-1]" />
    </>
  );
};
