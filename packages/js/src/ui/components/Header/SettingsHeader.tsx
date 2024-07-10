import { useStyle } from '../../helpers';
import { LeftArrow } from '../../icons';

type SettingsHeaderProps = {
  backAction: () => void;
};

export const SettingsHeader = (props: SettingsHeaderProps) => {
  const style = useStyle();
  return (
    <div class={style('settingsHeader', 'nt-flex nt-items-center nt-py-5 nt-px-6 nt-gap-2')}>
      <button
        class={style(
          ['button', 'settingsBackButton'],
          'nt-h-6 nt-w-6 nt-flex nt-justify-center nt-items-center nt-rounded-md nt-relative hover:nt-bg-foreground-alpha-50 focus:nt-bg-foreground-alpha-50 nt-text-foreground-alpha-600'
        )}
        onClick={props.backAction}
      >
        <LeftArrow />
      </button>
      <div class={style('settingsHeaderTitle', 'nt-text-xl nt-text-foreground nt-font-semibold')}>
        Notification Settings
      </div>
    </div>
  );
};
