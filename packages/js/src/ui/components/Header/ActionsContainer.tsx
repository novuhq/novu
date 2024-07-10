import { useStyle } from '../../helpers';
import { Settings } from '../../icons';
import { MoreActionsDropdown } from './MoreActionsDropdown';

type ActionsContainerProps = {
  showSettings: () => void;
};

export const ActionsContainer = (props: ActionsContainerProps) => {
  const style = useStyle();

  return (
    <div class={style('moreActionsContainer', 'nt-flex nt-gap-2')}>
      <MoreActionsDropdown />
      <button
        class={style(
          ['button', 'settingsIconContainer'],
          `nt-h-6 nt-w-6 nt-flex nt-justify-center nt-items-center nt-rounded-md
          nt-relative hover:nt-bg-foreground-alpha-50 nt-text-foreground-alpha-600`
        )}
        onClick={props.showSettings}
      >
        <Settings />
      </button>
    </div>
  );
};
ø;
