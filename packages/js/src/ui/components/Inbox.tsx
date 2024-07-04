import { JSX } from 'solid-js';
import { NovuOptions } from '../../novu';
import { Appearance, Localization, useAppearance, useLocalization } from '../context';
import { cn, useStyle } from '../helpers';
import { Bell } from './Bell';
import { Popover } from './Popover';

type InboxProps = {
  name: string;
  options: NovuOptions;
  appearance?: Appearance;
  localization?: Localization;
  open?: boolean;
  renderBell?: ({ unreadCount }: { unreadCount: number }) => JSX.Element;
};

export const Inbox = (props: InboxProps) => {
  const style = useStyle();
  const { id } = useAppearance();
  const { t } = useLocalization();

  return (
    <div class={style(cn('novu', id), 'root')}>
      <div class="nt-text-2xl nt-font-bold">{t('inbox.title')}</div>
      <Popover open={props?.open}>
        <Popover.Trigger>
          <Bell>{props.renderBell}</Bell>
        </Popover.Trigger>
        <Popover.Content>
          {/* notifications will go here */}
          <div class="nt-text-lg nt-font-bold">{t('inbox.title')}</div>
        </Popover.Content>
      </Popover>
    </div>
  );
};
