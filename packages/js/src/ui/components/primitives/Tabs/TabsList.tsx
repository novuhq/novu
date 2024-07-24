import { ParentProps, Ref } from 'solid-js';
import { useStyle } from '../../../helpers';

export const TabsList = (props: ParentProps & { ref?: Ref<HTMLDivElement> }) => {
  const style = useStyle();

  return (
    <div
      ref={props.ref}
      class={style('tabsList', 'nt-flex nt-gap-6 nt-px-6 nt-pt-1 nt-border-b nt-border-secondary nt-overflow-hidden')}
      role="tablist"
    >
      {props.children}
    </div>
  );
};
