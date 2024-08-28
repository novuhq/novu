import { Show } from 'solid-js';
import { useLocalization } from '../../../context';
import { useStyle } from '../../../helpers';
import { ArrowLeft } from '../../../icons';

type PreferencesHeaderProps = {
  navigateToNotifications?: () => void;
};

export const PreferencesHeader = (props: PreferencesHeaderProps) => {
  const style = useStyle();
  const { t } = useLocalization();

  return (
    <div class={style('preferencesHeader', 'nt-flex nt-items-center nt-py-5 nt-px-6 nt-gap-2')}>
      <Show when={props.navigateToNotifications}>
        {(navigateToNotifications) => (
          <button
            class={style(
              'preferencesHeader__back__button',
              'nt-h-6 nt-w-6 nt-flex nt-justify-center nt-items-center nt-rounded-md nt-relative hover:nt-bg-foreground-alpha-50 focus:nt-bg-foreground-alpha-50 nt-text-foreground-alpha-600'
            )}
            onClick={navigateToNotifications()}
          >
            <ArrowLeft />
          </button>
        )}
      </Show>
      <div
        data-localization="preferences.title"
        class={style('preferencesHeader__title', 'nt-text-xl nt-font-semibold')}
      >
        {t('preferences.title')}
      </div>
    </div>
  );
};
