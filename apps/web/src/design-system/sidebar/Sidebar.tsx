import styled from '@emotion/styled';
import { ActionIcon, createStyles, Drawer, Loader, MantineTheme, Stack } from '@mantine/core';
import { ReactNode } from 'react';
import { HEADER_HEIGHT } from '../../components/layout/constants';

import { When } from '../../components/utils/When';
import { useKeyDown } from '../../hooks';
import { colors, shadows } from '../config';
import { ArrowLeft, Close } from '../icons';

const HeaderHolder = styled.div`
  display: flex;
  flex-wrap: nowrap;
  gap: 12px;
  margin: 24px;
  margin-bottom: 0;
`;

const BodyHolder = styled.div`
  display: flex;
  flex-direction: column;
  overflow-x: hidden;
  overflow-y: auto;
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

const COLLAPSED_WIDTH = 480;
const NAVIGATION_WIDTH = 300;
const PAGE_MARGIN = 30;
const INTEGRATION_SETTING_TOP = HEADER_HEIGHT;

const useDrawerStyles = createStyles((theme: MantineTheme) => {
  return {
    root: {
      position: 'absolute',
      zIndex: 1,
    },
    drawer: {
      position: 'fixed',
      top: `${INTEGRATION_SETTING_TOP}px`,
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

const Form = styled.form`
  height: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: 24px;
`;

export const Sidebar = ({
  customFooter,
  customHeader,
  children,
  isOpened,
  isExpanded = false,
  isLoading = false,
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
        drawer: {
          width: isExpanded ? `calc(100% - ${NAVIGATION_WIDTH}px)` : COLLAPSED_WIDTH,
          transition: 'all 300ms ease !important',
          '@media screen and (max-width: 768px)': {
            width: isExpanded ? `100%` : COLLAPSED_WIDTH,
          },
        },
      }}
      classNames={drawerClasses}
      onClose={onCloseCallback}
      withOverlay={false}
      withCloseButton={false}
      closeOnEscape={false}
      withinPortal={false}
      trapFocus={false}
      data-expanded={isExpanded}
    >
      <Form name="form-name" noValidate onSubmit={onSubmit} data-test-id={dataTestId}>
        <HeaderHolder>
          {isExpanded && onBack && (
            <ActionIcon variant="transparent" onClick={onBack} data-test-id="sidebar-back">
              <ArrowLeft color={colors.B40} />
            </ActionIcon>
          )}
          {customHeader}
          <ActionIcon
            variant="transparent"
            onClick={onCloseCallback}
            style={{ marginLeft: 'auto' }}
            data-test-id="sidebar-close"
          >
            <Close color={colors.B40} />
          </ActionIcon>
        </HeaderHolder>
        <BodyHolder>
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
        {customFooter && <FooterHolder>{customFooter}</FooterHolder>}
      </Form>
    </Drawer>
  );
};
