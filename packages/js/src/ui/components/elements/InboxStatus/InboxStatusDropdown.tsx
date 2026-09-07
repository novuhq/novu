import { useInboxContext, useLocalization } from '../../../context';
import { cn, useStyle } from '../../../helpers';
import { ArrowDropDown as DefaultArrowDropDown } from '../../../icons';
import { Button, buttonVariants, Dropdown } from '../../primitives';
import { IconRendererWrapper } from '../../shared/IconRendererWrapper';
import { inboxFilterLocalizationKeys } from './constants';
import { StatusOptions } from './InboxStatusOptions';

export const StatusDropdown = () => {
  const style = useStyle();
  const { status, setStatus } = useInboxContext();
  const { t } = useLocalization();
  const arrowDropDownIconClass = style({
    key: 'inboxStatus__dropdownItemRight__icon',
    className: 'nt-text-foreground-alpha-600 nt-size-4',
    iconKey: 'arrowDropDown',
  });

  return (
    <Dropdown.Root>
      <Dropdown.Trigger
        class={style({
          key: 'inboxStatus__dropdownTrigger',
          className: cn(buttonVariants({ variant: 'unstyled', size: 'none' }), 'nt-gap-0.5'),
        })}
        asChild={(triggerProps) => (
          <Button variant="unstyled" size="none" {...triggerProps}>
            <span
              data-localization={inboxFilterLocalizationKeys[status()]}
              class={style({
                key: 'inboxStatus__title',
                className: 'nt-text-base',
              })}
            >
              {t(inboxFilterLocalizationKeys[status()])}
            </span>
            <IconRendererWrapper
              iconKey="arrowDropDown"
              class={arrowDropDownIconClass}
              fallback={<DefaultArrowDropDown class={arrowDropDownIconClass} />}
            />
          </Button>
        )}
      />
      <Dropdown.Content appearanceKey="inboxStatus__dropdownContent">
        <StatusOptions setStatus={setStatus} status={status()} />
      </Dropdown.Content>
    </Dropdown.Root>
  );
};
