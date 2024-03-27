import { css } from '@emotion/react';
import styled from '@emotion/styled';
import { createStyles, CSSObject, Drawer, DrawerStylesNames, Loader, MantineTheme, Stack, Styles } from '@mantine/core';
import { ReactNode } from 'react';
import { useKeyDown } from '@novu/shared-web';

import { ActionButton } from '../button/ActionButton';
import { When } from '../when';
import { colors, shadows } from '../config';
import { ArrowLeft } from '../icons';
import { Close } from './Close';

const HeaderHolder = styled.div`
  display: flex;
  flex-wrap: nowrap;
  gap: 12px;
  margin: 24px;
  margin-bottom: 0;
`;

const scrollable = css`
  overflow-x: hidden;
  overflow-y: auto;
`;

const BodyHolder = styled.div<{ isParentScrollable: boolean }>`
  display: flex;
  flex-direction: column;
  ${(props) => !props.isParentScrollable && scrollable};
  margin: 0 24px;
  gap: 24px;
  padding-right: 5px;
  margin-right: 19px;
  height: 100%;
`;

const FooterHolder = styled.div`
  display: flex;
  flex-wrap: nowrap;
  gap: 6px;
  margin: 24px;
  margin-top: 0;
  margin-top: auto;
`;

const COLLAPSED_WIDTH = 600;
const NAVIGATION_WIDTH = 300;

const useDrawerStyles = createStyles((theme: MantineTheme) => {
  return {
    root: {
      position: 'absolute',
    },
    drawer: {
      position: 'fixed',
      top: 40,
      right: 0,
      bottom: 0,
      backgroundColor: theme.colorScheme === 'dark' ? colors.B17 : colors.white,
      borderTopLeftRadius: 7,
      borderBottomLeftRadius: 7,
      boxShadow: shadows.dark,
    },
    body: {
      height: '100%',
    },
  };
});

const Form = styled.form<{ isParentScrollable: boolean }>`
  height: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: 24px;
  ${(props) => props.isParentScrollable && scrollable};
`;

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
}: {
  customHeader?: ReactNode;
  customFooter?: ReactNode;
  children: ReactNode;
  isOpened: boolean;
  isExpanded?: boolean;
  isLoading?: boolean;
  isParentScrollable?: boolean;
  styles?: Styles<DrawerStylesNames, Record<string, any>>;
  onClose: () => void;
  onBack?: () => void;
  onSubmit?: React.FormEventHandler<HTMLFormElement>;
  'data-test-id'?: string;
}) => {
  const { classes: drawerClasses } = useDrawerStyles();
  const onCloseCallback = () => {
    onClose();
  };

  useKeyDown('Escape', onCloseCallback);

  return (
    <Drawer
      opened={isOpened}
      position="right"
      styles={{
        ...styles,
        drawer: {
          width: isExpanded ? `calc(100% - ${NAVIGATION_WIDTH}px)` : COLLAPSED_WIDTH,
          transition: 'all 300ms ease !important',
          '@media screen and (max-width: 768px)': {
            width: isExpanded ? `100%` : COLLAPSED_WIDTH,
          },
          ...((styles && ((styles as any).drawer as CSSObject)) ?? {}),
        },
      }}
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
