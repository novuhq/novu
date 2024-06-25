import { Notification } from '../feeds';
import type { NovuOptions } from '../novu';
import { Bell } from './components';
import { Appearance, AppearanceProvider, NovuProvider } from './context';
import { useStyle } from './helpers';
import { Localization, LocalizationProvider, useLocalization } from './context/LocalizationContext';

type InboxProps = {
  id: string;
  name: string;
  options: NovuOptions;
  appearance?: Appearance;
  localization?: Localization;
};

export const Inbox = (props: InboxProps) => {
  return (
    <NovuProvider options={props.options}>
      <LocalizationProvider localization={props.localization}>
        <AppearanceProvider id={props.id} elements={props.appearance?.elements} variables={props.appearance?.variables}>
          <InternalInbox />
        </AppearanceProvider>
      </LocalizationProvider>
    </NovuProvider>
  );
};

type InternalInboxProps = {
  feeds: Notification[];
};

const InternalInbox = () => {
  const style = useStyle();
  const { t } = useLocalization();

  return (
    <div class={style('novu', 'root')}>
      <div class="nt-text-2xl nt-font-bold">Inbox</div>
      <Bell />
    </div>
  );
};
