import { Show } from 'solid-js';
import { useStyle } from '../../../helpers';
import { Settings } from '../../../icons';
import { Button } from '../../primitives';
import { MoreActionsDropdown } from './MoreActionsDropdown';

type ActionsContainerProps = {
  showPreferences?: () => void;
};

export const ActionsContainer = (props: ActionsContainerProps) => {
  const style = useStyle();

  return (
    <div class={style('moreActionsContainer', 'nt-flex nt-gap-3')}>
      <MoreActionsDropdown />
      <Show when={props.showPreferences}>
        {(showPreferences) => (
          <Button appearanceKey="preferences__button" variant="ghost" size="iconSm" onClick={showPreferences()}>
            <Settings class={style('preferences__icon', 'nt-size-5')} />
          </Button>
        )}
      </Show>
    </div>
  );
};
