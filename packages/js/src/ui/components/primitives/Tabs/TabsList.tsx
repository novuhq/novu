import { ParentProps, Ref } from 'solid-js';
import { useStyle } from '../../../helpers';

export const TabsList = (props: ParentProps & { ref?: Ref<HTMLDivElement> }) => {
  const style = useStyle();

  return (
    <>
      <div
        ref={props.ref}
        class={style('tabsList', 'nt-flex nt-gap-6 nt-px-6 nt-py-1 nt-overflow-hidden')}
        role="tablist"
      >
        {props.children}
      </div>
      <div class="nt-border-t nt-border-secondary nt-mt-[-0.25rem] nt-relative nt-z-[-1]" />
    </>
  );
};
