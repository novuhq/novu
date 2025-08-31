import { JSXElement } from 'solid-js';
import { JSX as SolidJSX } from 'solid-js/jsx-runtime';
import { useArchiveAll, useArchiveAllRead, useReadAll } from '../../../api';
import { StringLocalizationKey, useInboxContext, useLocalization } from '../../../context';
import { cn, useStyle } from '../../../helpers';
import { MarkAsArchived, MarkAsArchivedRead, MarkAsRead } from '../../../icons';
import { IconKey, IconOverrides } from '../../../types';
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
  const moreActionsIconClass = style({
    key: 'moreActions__dropdownItemLeft__icon',
    className: 'nt-size-3',
    iconKey: props.iconKey,
  });

  return (
    <Dropdown.Item
      class={style({
        key: 'moreActions__dropdownItem',
        className: cn(dropdownItemVariants(), 'nt-flex nt-gap-2'),
      })}
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
        class={style({
          key: 'moreActions__dropdownItemLabel',
          className: 'nt-leading-none',
        })}
      >
        {t(props.localizationKey)}
      </span>
    </Dropdown.Item>
  );
};
