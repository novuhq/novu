import { Show } from 'solid-js';
import { useLocalization } from '../../../context';
import { useStyle } from '../../../helpers';
import { ArrowLeft } from '../../../icons';
import { Button } from '../../primitives';

type PreferencesHeaderProps = {
  navigateToNotifications?: () => void;
};

export const PreferencesHeader = (props: PreferencesHeaderProps) => {
  const style = useStyle();
  const { t } = useLocalization();

  return (
    <div
      class={style(
        'preferencesHeader',
        'nt-flex nt-bg-neutral-alpha-25 nt-shrink-0 nt-border-b nt-border-border nt-items-center nt-py-3.5 nt-px-4 nt-gap-2'
      )}
    >
      <Show when={props.navigateToNotifications}>
        {(navigateToNotifications) => (
          <Button
            appearanceKey="preferencesHeader__back__button"
            class="nt-text-foreground-alpha-600"
            variant="unstyled"
            size="none"
            onClick={navigateToNotifications()}
          >
            <ArrowLeft class={style('preferencesHeader__back__button__icon', 'nt-size-4')} />
          </Button>
        )}
      </Show>
      <div
        data-localization="preferences.title"
        class={style('preferencesHeader__title', 'nt-text-base nt-font-medium')}
      >
        {t('preferences.title')}
      </div>
    </div>
  );
};
