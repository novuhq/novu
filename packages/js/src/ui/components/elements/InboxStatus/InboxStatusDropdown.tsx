import { useInboxContext, useLocalization } from '../../../context';
import { cn, useStyle } from '../../../helpers';
import { ArrowDropDown } from '../../../icons';
import { Button, buttonVariants, Dropdown } from '../../primitives';
import { inboxFilterLocalizationKeys } from './constants';
import { StatusOptions } from './InboxStatusOptions';

export const StatusDropdown = () => {
  const style = useStyle();
  const { status, setStatus } = useInboxContext();
  const { t } = useLocalization();

  return (
    <Dropdown.Root>
      <Dropdown.Trigger
        class={style(
          'inboxStatus__dropdownTrigger',
          cn(buttonVariants({ variant: 'unstyled', size: 'none' }), 'nt-gap-2')
        )}
        asChild={(triggerProps) => (
          <Button variant="unstyled" size="none" {...triggerProps}>
            <span
              data-localization={inboxFilterLocalizationKeys[status()]}
              class={style('inboxStatus__title', 'nt-text-xl nt-font-semibold')}
            >
              {t(inboxFilterLocalizationKeys[status()])}
            </span>
            <span class={style('inboxStatus__dropdownItemRight__icon', 'nt-text-foreground-alpha-600')}>
              <ArrowDropDown />
            </span>
          </Button>
        )}
      />
      <Dropdown.Content appearanceKey="inboxStatus__dropdownContent">
        <StatusOptions setStatus={setStatus} status={status()} />
      </Dropdown.Content>
    </Dropdown.Root>
  );
};
