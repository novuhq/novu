import { JSX } from 'solid-js';
import { useArchiveAll, useArchiveAllRead, useReadAll } from '../../../api';
import { StringLocalizationKey, useInboxContext, useLocalization } from '../../../context';
import { cn, useStyle } from '../../../helpers';
import { Archive, ArchiveRead, ReadAll } from '../../../icons';
import { Dropdown, dropdownItemVariants } from '../../primitives';

export const MoreActionsOptions = () => {
  const { filter } = useInboxContext();
  const { readAll } = useReadAll();
  const { archiveAll } = useArchiveAll();
  const { archiveAllRead } = useArchiveAllRead();

  return (
    <>
      <ActionsItem
        localizationKey="notifications.actions.readAll"
        onClick={() => readAll({ tags: filter().tags })}
        icon={ReadAll}
      />
      <ActionsItem
        localizationKey="notifications.actions.archiveAll"
        onClick={() => archiveAll({ tags: filter().tags })}
        icon={Archive}
      />
      <ActionsItem
        localizationKey="notifications.actions.archiveRead"
        onClick={() => archiveAllRead({ tags: filter().tags })}
        icon={ArchiveRead}
      />
    </>
  );
};

export const ActionsItem = (props: {
  localizationKey: StringLocalizationKey;
  onClick: () => void;
  icon: () => JSX.Element;
}) => {
  const style = useStyle();
  const { t } = useLocalization();

  return (
    <Dropdown.Item
      class={style('moreActions__dropdownItem', cn(dropdownItemVariants(), 'nt-flex nt-gap-2'))}
      onClick={props.onClick}
    >
      <span class={style('moreActions__dropdownItemLeft__icon', 'nt-text-foreground-alpha-600')}>{props.icon()}</span>
      <span data-localization={props.localizationKey} class={style('moreActions__dropdownItemLabel')}>
        {t(props.localizationKey)}
      </span>
    </Dropdown.Item>
  );
};
