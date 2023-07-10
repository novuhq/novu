import { ReactNode, useEffect } from 'react';
import { ActionIcon, createStyles, Drawer, Loader, MantineTheme, Stack } from '@mantine/core';
import styled from '@emotion/styled';

import { colors, shadows } from '../config';
import { ArrowLeft, Close } from '../icons';
import { When } from '../../components/utils/When';

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
const HEADER_HEIGHT = 65;
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
}) => {
  const { classes: drawerClasses } = useDrawerStyles();

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <Drawer
      opened={isOpened}
      position="right"
      styles={{
        drawer: {
          width: isExpanded ? `calc(100% - ${NAVIGATION_WIDTH + PAGE_MARGIN}px)` : COLLAPSED_WIDTH,
          transition: 'all 300ms ease !important',
          '@media screen and (max-width: 768px)': {
            width: isExpanded ? `100%` : COLLAPSED_WIDTH,
          },
        },
      }}
      classNames={drawerClasses}
      onClose={onClose}
      withOverlay={false}
      withCloseButton={false}
      closeOnEscape={false}
      withinPortal={false}
      trapFocus={false}
    >
      <Form noValidate onSubmit={onSubmit}>
        <HeaderHolder>
          {isExpanded && (
            <ActionIcon variant="transparent" onClick={onBack}>
              <ArrowLeft color={colors.B40} />
            </ActionIcon>
          )}
          {customHeader}
          <ActionIcon variant="transparent" onClick={onClose} style={{ marginLeft: 'auto' }}>
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
