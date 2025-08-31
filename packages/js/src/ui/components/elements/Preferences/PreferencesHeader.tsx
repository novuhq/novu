import { Show } from 'solid-js';
import { useLocalization } from '../../../context';
import { useStyle } from '../../../helpers';
import { ArrowLeft as DefaultArrowLeft } from '../../../icons';
import { Button } from '../../primitives';
import { IconRendererWrapper } from '../../shared/IconRendererWrapper';

type PreferencesHeaderProps = {
  navigateToNotifications?: () => void;
};

export const PreferencesHeader = (props: PreferencesHeaderProps) => {
  const style = useStyle();
  const { t } = useLocalization();
  const arrowLeftIconClass = style({
    key: 'preferencesHeader__back__button__icon',
    className: 'nt-size-4',
    iconKey: 'arrowLeft',
  });

  return (
    <div
      class={style({
        key: 'preferencesHeader',
        className:
          'nt-flex nt-bg-neutral-alpha-25 nt-shrink-0 nt-border-b nt-border-border nt-items-center nt-py-3.5 nt-px-4 nt-gap-2',
      })}
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
            <IconRendererWrapper
              iconKey="arrowLeft"
              class={arrowLeftIconClass}
              fallback={<DefaultArrowLeft class={arrowLeftIconClass} />}
            />
          </Button>
        )}
      </Show>
      <div
        data-localization="preferences.title"
        class={style({
          key: 'preferencesHeader__title',
          className: 'nt-text-base nt-font-medium',
        })}
      >
        {t('preferences.title')}
      </div>
    </div>
  );
};
