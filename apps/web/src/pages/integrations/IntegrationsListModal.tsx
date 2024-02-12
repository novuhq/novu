import { useCallback, useEffect, useReducer, useState } from 'react';
import { Group, Modal, ActionIcon, createStyles, MantineTheme } from '@mantine/core';
import { ChannelTypeEnum } from '@novu/shared';

import { useKeyDown } from '../../hooks';
import { colors, Close } from '@novu/design-system';
import { useSegment } from '../../components/providers/SegmentProvider';
import { IntegrationsStoreModalAnalytics } from './constants';
import type { IIntegratedProvider, ITableIntegration } from './types';
import { IntegrationsList } from './IntegrationsList';
import { Row } from 'react-table';
import { SelectProviderSidebar } from './components/multi-provider/SelectProviderSidebar';
import { CreateProviderInstanceSidebar } from './components/multi-provider/CreateProviderInstanceSidebar';
import { UpdateProviderSidebar } from './components/multi-provider/UpdateProviderSidebar';

enum SidebarType {
  SELECT = 'select',
  CREATE = 'create',
  UPDATE = 'update',
}

enum ActionsTypeEnum {
  CLEAR = 'CLEAR',
  SHOW_SELECT_SIDEBAR = 'SHOW_SELECT_SIDEBAR',
  SHOW_CREATE_SIDEBAR = 'SHOW_CREATE_SIDEBAR',
  SHOW_UPDATE_SIDEBAR = 'SHOW_UPDATE_SIDEBAR',
}

type ActionType =
  | { type: ActionsTypeEnum.CLEAR }
  | { type: ActionsTypeEnum.SHOW_SELECT_SIDEBAR; payload: { scrollTo?: ChannelTypeEnum } }
  | { type: ActionsTypeEnum.SHOW_CREATE_SIDEBAR; payload: { provider: IIntegratedProvider } }
  | {
      type: ActionsTypeEnum.SHOW_UPDATE_SIDEBAR;
      payload: { integrationIdToEdit: string };
    };

interface IModalState {
  scrollTo?: ChannelTypeEnum;
  sidebarType?: SidebarType;
  provider?: IIntegratedProvider | null;
  integrationIdToEdit?: string;
}

const reducer = (state: IModalState, action: ActionType) => {
  switch (action.type) {
    case ActionsTypeEnum.CLEAR:
      return {};
    case ActionsTypeEnum.SHOW_SELECT_SIDEBAR:
      return {
        ...state,
        sidebarType: SidebarType.SELECT,
        scrollTo: action.payload.scrollTo,
      };
    case ActionsTypeEnum.SHOW_CREATE_SIDEBAR:
      return {
        ...state,
        sidebarType: SidebarType.CREATE,
        provider: action.payload.provider,
      };
    case ActionsTypeEnum.SHOW_UPDATE_SIDEBAR:
      return {
        ...state,
        sidebarType: SidebarType.UPDATE,
        integrationIdToEdit: action.payload.integrationIdToEdit,
      };
    default:
      return state;
  }
};

export function IntegrationsListModal({
  isOpen,
  onClose,
  selectedProvider = null,
  scrollTo: scrollToProp,
}: {
  scrollTo?: ChannelTypeEnum;
  isOpen: boolean;
  onClose: () => void;
  selectedProvider?: IIntegratedProvider | null;
}) {
  const [{ integrationIdToEdit, provider, sidebarType, scrollTo }, dispatch] = useReducer(reducer, {
    sidebarType: !!scrollToProp ? SidebarType.SELECT : undefined,
    provider: selectedProvider,
  });

  const segment = useSegment();
  const { classes } = useModalStyles();

  const handleModalClose = () => {
    onClose();
    dispatch({ type: ActionsTypeEnum.CLEAR });

    segment.track(IntegrationsStoreModalAnalytics.CLOSE_MODAL);
  };

  const onRowClickCallback = (item: Row<ITableIntegration>) => {
    const integration = item.original;
    dispatch({
      type: ActionsTypeEnum.SHOW_UPDATE_SIDEBAR,
      payload: { integrationIdToEdit: integration.integrationId },
    });

    segment.track(IntegrationsStoreModalAnalytics.SELECT_PROVIDER_CLICK, {
      providerId: integration.providerId,
      channel: integration.channel,
      name: integration.provider,
      active: integration.active,
    });
  };

  const onSidebarClose = () => dispatch({ type: ActionsTypeEnum.CLEAR });

  const showSelectSidebar = useCallback(
    (scrollToChannel?: ChannelTypeEnum) =>
      dispatch({ type: ActionsTypeEnum.SHOW_SELECT_SIDEBAR, payload: { scrollTo: scrollToChannel } }),
    [dispatch]
  );

  const onSelectSidebarNextStepClick = (newProvider: IIntegratedProvider) => {
    dispatch({
      type: ActionsTypeEnum.SHOW_CREATE_SIDEBAR,
      payload: { provider: newProvider },
    });
  };

  const onIntegrationCreated = (integrationId: string) => {
    dispatch({
      type: ActionsTypeEnum.SHOW_UPDATE_SIDEBAR,
      payload: { integrationIdToEdit: integrationId },
    });
  };

  useKeyDown('Escape', () => {
    if (isOpen && !sidebarType) {
      handleModalClose();
    }
  });

  useEffect(() => {
    if (isOpen && scrollToProp) {
      showSelectSidebar(scrollToProp);
    }
  }, [showSelectSidebar, isOpen, scrollToProp]);

  return (
    <Modal
      withinPortal
      withCloseButton={false}
      closeOnEscape={!sidebarType}
      title={
        !sidebarType ? (
          <Group style={{ width: '100%' }} position={'apart'}>
            <ActionIcon variant={'transparent'} ml="auto" onClick={handleModalClose}>
              <Close />
            </ActionIcon>
          </Group>
        ) : undefined
      }
      classNames={classes}
      fullScreen
      opened={isOpen}
      onClose={handleModalClose}
      styles={{ modal: { overflowX: 'hidden', overflowY: sidebarType ? 'hidden' : 'auto' } }}
      data-test-id="integrations-list-modal"
    >
      <IntegrationsList
        withOutlet={false}
        onAddProviderClick={() => showSelectSidebar()}
        onRowClickCallback={onRowClickCallback}
        onChannelClick={showSelectSidebar}
      />
      <SelectProviderSidebar
        isOpened={sidebarType === SidebarType.SELECT}
        onClose={onSidebarClose}
        onNextStepClick={onSelectSidebarNextStepClick}
        scrollTo={scrollTo}
      />
      <CreateProviderInstanceSidebar
        isOpened={sidebarType === SidebarType.CREATE}
        onGoBack={showSelectSidebar}
        onClose={onSidebarClose}
        onIntegrationCreated={onIntegrationCreated}
        providerId={provider?.providerId}
        channel={provider?.channel}
      />
      <UpdateProviderSidebar
        key={integrationIdToEdit}
        isOpened={sidebarType === SidebarType.UPDATE}
        onClose={onSidebarClose}
        integrationId={integrationIdToEdit}
      />
    </Modal>
  );
}

const useModalStyles = createStyles((theme: MantineTheme) => {
  const dark = theme.colorScheme === 'dark';

  return {
    root: {
      backdropFilter: 'blur(5px)',
    },
    header: {
      position: 'sticky',
      top: 10,
      zIndex: 9,
      margin: 0,
      marginBottom: -28,
      marginRight: -34,
    },
    title: {
      width: '100%',
      marginRight: 0,
      h1: {
        fontSize: 22,
      },
      '@media screen and (min-width: 1367px)': {
        h1: {
          fontSize: 26,
        },
      },
    },
    modal: {
      padding: '0px 40px !important',
      backgroundColor: dark ? theme.fn.rgba(colors.BGDark, 0.8) : theme.fn.rgba(colors.white, 0.7),

      '.mantine-Drawer-root': {
        ['&[data-expanded="true"]']: {
          '.mantine-Drawer-drawer': {
            width: '100%',
            borderRadius: 0,
          },
        },

        '.mantine-Drawer-drawer': {
          top: 0,
        },
      },
    },
    body: {
      marginTop: 40,
      marginBottom: 40,
    },
  };
});
