import type { NovuOptions } from '../novu';
import { BellContainer } from './components';
import { Appearance, AppearanceProvider, NovuProvider } from './context';
import { Localization, LocalizationProvider, useLocalization } from './context/LocalizationContext';
import { useStyle } from './helpers';

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
        <AppearanceProvider id={props.id} appearance={props.appearance}>
          <InternalInbox />
        </AppearanceProvider>
      </LocalizationProvider>
    </NovuProvider>
  );
};

const InternalInbox = () => {
  const style = useStyle();
  const { t } = useLocalization();

  return (
    <div class={style('novu', 'root')}>
      <div class="nt-text-2xl nt-font-bold">{t('inbox.title')}</div>
      <BellContainer />
    </div>
  );
};
