import { useAppearance } from 'src/ui/context';
import { cn, useStyle } from 'src/ui/helpers';
import { DotsMenu, Settings } from '../../icons';

export const Actions = () => {
  const style = useStyle();
  const { id } = useAppearance();

  return (
    <div class="nt-flex nt-gap-2">
      <button
        class={style(
          'moreActionsIconContainer',
          cn(
            id,
            `nt-h-6 nt-w-6 nt-flex nt-justify-center
        nt-items-center nt-rounded-md nt-relative
        hover:nt-bg-foreground-alpha-50
        nt-text-foreground-alpha-600`
          )
        )}
      >
        <DotsMenu />
      </button>
      <button
        class={style(
          'settingsIconContainer',
          cn(
            id,
            `nt-h-6 nt-w-6 nt-flex nt-justify-center
        nt-items-center nt-rounded-md nt-relative
        hover:nt-bg-foreground-alpha-50
        nt-text-foreground-alpha-600`
          )
        )}
      >
        <Settings />
      </button>
    </div>
  );
};
