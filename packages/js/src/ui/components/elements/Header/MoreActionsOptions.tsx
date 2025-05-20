import { JSX, Show, JSXElement } from 'solid-js';
import { JSX as SolidJSX } from 'solid-js/jsx-runtime';
import { useArchiveAll, useArchiveAllRead, useReadAll } from '../../../api';
import { StringLocalizationKey, useInboxContext, useLocalization, useAppearance } from '../../../context';
import { cn, useStyle } from '../../../helpers';
import { MarkAsArchived, MarkAsArchivedRead, MarkAsRead } from '../../../icons';
import { IconOverrides, IconKey } from '../../../types';
import { Dropdown, dropdownItemVariants } from '../../primitives';
import { IconRendererWrapper } from '../../shared/IconRendererWrapper';

type IconComponentType = (props?: SolidJSX.HTMLAttributes<SVGSVGElement>) => JSXElement;

const iconKeyToComponentMap: { [key in keyof IconOverrides]?: IconComponentType } = {
  markAsRead: MarkAsRead,
  markAsArchived: MarkAsArchived,
  markAsArchivedRead: MarkAsArchivedRead,
};

export const MoreActionsOptions = () => {
  const { filter } = useInboxContext();
  const { readAll } = useReadAll();
  const { archiveAll } = useArchiveAll();
  const { archiveAllRead } = useArchiveAllRead();

  return (
    <>
      <ActionsItem
        localizationKey="notifications.actions.readAll"
        onClick={() => readAll({ tags: filter().tags, data: filter().data })}
        iconKey="markAsRead"
      />
      <ActionsItem
        localizationKey="notifications.actions.archiveAll"
        onClick={() => archiveAll({ tags: filter().tags, data: filter().data })}
        iconKey="markAsArchived"
      />
      <ActionsItem
        localizationKey="notifications.actions.archiveRead"
        onClick={() => archiveAllRead({ tags: filter().tags, data: filter().data })}
        iconKey="markAsArchivedRead"
      />
    </>
  );
};

export const ActionsItem = (props: {
  localizationKey: StringLocalizationKey;
  onClick: () => void;
  iconKey: IconKey;
}) => {
  const style = useStyle();
  const { t } = useLocalization();
  const DefaultIconComponent = iconKeyToComponentMap[props.iconKey];
  const moreActionsIconClass = style('moreActions__dropdownItemLeft__icon', 'nt-size-3', {
    iconKey: props.iconKey,
  });

  return (
    <Dropdown.Item
      class={style('moreActions__dropdownItem', cn(dropdownItemVariants(), 'nt-flex nt-gap-2'))}
      onClick={props.onClick}
    >
      <IconRendererWrapper
        iconKey={props.iconKey}
        class={moreActionsIconClass}
        fallback={
          DefaultIconComponent &&
          DefaultIconComponent({
            class: moreActionsIconClass,
          })
        }
      />
      <span
        data-localization={props.localizationKey}
        class={style('moreActions__dropdownItemLabel', 'nt-leading-none')}
      >
        {t(props.localizationKey)}
      </span>
    </Dropdown.Item>
  );
};
