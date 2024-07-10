import { useStyle } from '../../helpers';
import { Settings } from '../../icons';
import { MoreActionsDropdown } from './MoreActionsDropdown';

export const ActionsContainer = () => {
  const style = useStyle();
  return (
    <div class={style('moreActionsContainer', 'nt-flex nt-gap-2')}>
      <MoreActionsDropdown />
      <button
        class={style(
          'settingsIconContainer',
          'nt-h-6 nt-w-6 nt-flex nt-justify-center nt-items-center nt-rounded-md nt-relative hover:nt-bg-foreground-alpha-50 nt-text-foreground-alpha-600'
        )}
      >
        <Settings />
      </button>
    </div>
  );
};
