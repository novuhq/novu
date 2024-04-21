import { cx } from '@emotion/css';
import { Drawer, Loader, Stack } from '@mantine/core';
import { useKeyDown } from '@novu/shared-web';
import { ActionButton } from '../button/ActionButton';
import { colors } from '../config';
import { ArrowLeft } from '../icons';
import { When } from '../when';
import { Close } from './Close';
import {
  BodyHolder,
  FooterHolder,
  HeaderHolder,
  scrollable,
  sidebarDrawerContentClassName,
  useDrawerStyles,
} from './Sidebar.styles';
import { ISidebarBaseProps } from './Sidebar.types';

/**
 * A Sidebar component without the form element that wraps content.
 *
 * This is a temporary solution to a overloaded pattern. The Sidebar component should
 * not have an embedded form as it removes the caller from properly controlling their own form.
 * We will refactor the Sidebar later on as part of the design system work.
 *
 * https://linear.app/novu/issue/NV-3632/de-couple-the-sidebar-from-its-internal-form
 */

export const SidebarFormless = ({
  customFooter,
  customHeader,
  children,
  isOpened,
  isExpanded = false,
  isLoading = false,
  isParentScrollable = false,
  styles,
  'data-test-id': dataTestId,
  onClose,
  onBack,
}: ISidebarBaseProps) => {
  const { classes: drawerClasses } = useDrawerStyles({ isExpanded });
  const onCloseCallback = () => {
    onClose();
  };

  useKeyDown('Escape', onCloseCallback);

  return (
    <Drawer
      opened={isOpened}
      position="right"
      styles={styles}
      classNames={drawerClasses}
      onClose={onCloseCallback}
      withOverlay={false}
      withCloseButton={false}
      closeOnEscape={false}
      withinPortal={true}
      trapFocus={false}
      data-expanded={isExpanded}
    >
      <div
        data-test-id={dataTestId}
        className={cx(sidebarDrawerContentClassName, { [scrollable]: isParentScrollable })}
      >
        <HeaderHolder className="sidebar-header-holder">
          {isExpanded && onBack && (
            <ActionButton
              onClick={onBack}
              Icon={ArrowLeft}
              data-test-id="sidebar-back"
              sx={{
                '> svg': {
                  width: 16,
                  height: 16,
                },
              }}
            />
          )}
          {customHeader}
          <ActionButton
            onClick={onCloseCallback}
            Icon={Close}
            sx={{
              marginLeft: 'auto',
              '> svg': {
                width: 14,
                height: 14,
              },
            }}
            data-test-id="sidebar-close"
          />
        </HeaderHolder>
        <BodyHolder isParentScrollable={isParentScrollable} className="sidebar-body-holder">
          <When truthy={isLoading}>
            <Stack
              align="center"
              justify="center"
              sx={{
                height: '100%',
              }}
            >
              <Loader color={colors.error} size={32} />
            </Stack>
          </When>
          <When truthy={!isLoading}>{children}</When>
        </BodyHolder>
        {customFooter && <FooterHolder className="sidebar-footer-holder">{customFooter}</FooterHolder>}
      </div>
    </Drawer>
  );
};
