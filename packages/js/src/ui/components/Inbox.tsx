import { useAppearance, useNovu } from '../context';
import { useLocalization } from '../context/LocalizationContext';
import { cn, useStyle } from '../helpers';
import { Bell } from './Bell';

export const Inbox = () => {
  const style = useStyle();
  const { id } = useAppearance();
  const { t } = useLocalization();

  return (
    <div class={style(cn('novu', id), 'root')}>
      <div class="nt-text-2xl nt-font-bold">{t('inbox.title')}</div>
      <Bell />
    </div>
  );
};
