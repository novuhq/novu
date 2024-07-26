import { ParentProps, Ref } from 'solid-js';
import { AppearanceKey } from '../../../context';
import { cn, useStyle } from '../../../helpers';

type TabsListProps = ParentProps & { class?: string; appearanceKey?: AppearanceKey; ref?: Ref<HTMLDivElement> };

export const TabsList = (props: TabsListProps) => {
  const style = useStyle();

  return (
    <>
      <div
        ref={props.ref}
        class={style(
          props.appearanceKey ?? 'tabsList',
          cn('nt-flex nt-gap-6 nt-px-6 nt-py-1 nt-overflow-hidden', props.class)
        )}
        role="tablist"
      >
        {props.children}
      </div>
      <div class="nt-border-t nt-border-secondary nt-mt-[-0.25rem] nt-relative nt-z-[-1]" />
    </>
  );
};
