import { useInboxStatusContext, useLocalization } from '../../../context';
import { useStyle } from '../../../helpers';
import { ArrowDropDown } from '../../../icons';
import { Button, buttonVariants, Dropdown } from '../../primitives';
import { inboxStatusLocalizationKeys } from './constants';
import { StatusOptions } from './InboxStatusOptions';

export const StatusDropdown = () => {
  const style = useStyle();
  const { status, setStatus } = useInboxStatusContext();
  const { t } = useLocalization();

  return (
    <Dropdown.Root>
      <Dropdown.Trigger
        class={style('inboxStatus__dropdownTrigger', buttonVariants({ variant: 'unstyled', size: 'none' }))}
        asChild={(triggerProps) => (
          <Button variant="unstyled" size="none" {...triggerProps}>
            <span class={style('inboxStatus__title', 'nt-text-xl nt-font-semibold')}>
              {t(inboxStatusLocalizationKeys[status()])}
            </span>
            <span class={style('inboxStatus__dropdownItemRightIcon', 'nt-text-foreground-alpha-600')}>
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
