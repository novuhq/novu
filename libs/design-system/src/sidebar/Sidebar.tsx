import styled from '@emotion/styled';
import { Drawer, Loader, Stack } from '@mantine/core';
import { useKeyDown } from '@novu/shared-web';

import { ActionButton } from '../button/ActionButton';
import { colors } from '../config';
import { ArrowLeft } from '../icons';
import { When } from '../when';
import { Close } from './Close';
import { BodyHolder, FooterHolder, HeaderHolder, scrollable, useDrawerStyles } from './Sidebar.styles';
import { ISidebarBaseProps } from './Sidebar.types';

const Form = styled.form<{ isParentScrollable: boolean }>`
  height: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: 24px;
  ${(props) => props.isParentScrollable && scrollable};
`;

export interface ISidebarProps extends ISidebarBaseProps {
  onSubmit?: React.FormEventHandler<HTMLFormElement>;
}

export const Sidebar = ({
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
  onSubmit,
}: ISidebarProps) => {
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
      <Form
        name="form-name"
        noValidate
        onSubmit={onSubmit}
        data-test-id={dataTestId}
        isParentScrollable={isParentScrollable}
        onClick={(e) => {
          e.stopPropagation();
        }}
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
      </Form>
    </Drawer>
  );
};
