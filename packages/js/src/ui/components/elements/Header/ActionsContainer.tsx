import { Show } from 'solid-js';
import { useStyle } from '../../../helpers';
import { Settings as DefaultSettings } from '../../../icons';
import { useAppearance } from '../../../context';
import { Button } from '../../primitives';
import { MoreActionsDropdown } from './MoreActionsDropdown';

type ActionsContainerProps = {
  showPreferences?: () => void;
};

export const ActionsContainer = (props: ActionsContainerProps) => {
  const style = useStyle();
  const appearance = useAppearance();

  return (
    <div class={style('moreActionsContainer', 'nt-flex nt-gap-3')}>
      <MoreActionsDropdown />
      <Show when={props.showPreferences}>
        {(showPreferences) => (
          <Button appearanceKey="preferences__button" variant="ghost" size="iconSm" onClick={showPreferences()}>
            <Show
              when={appearance.icons()?.settings}
              fallback={<DefaultSettings class={style('preferences__icon', 'nt-size-5')} />}
            >
              {(renderSettings) => renderSettings()({ class: style('preferences__icon', 'nt-size-5') })}
            </Show>
          </Button>
        )}
      </Show>
    </div>
  );
};
