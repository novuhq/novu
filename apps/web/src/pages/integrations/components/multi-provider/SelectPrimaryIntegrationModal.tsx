import { useCallback, useMemo, useState } from 'react';
import { Modal, useMantineTheme } from '@mantine/core';
import styled from '@emotion/styled';
import type { Row } from 'react-table';
import { ChannelTypeEnum } from '@novu/shared';

import {
  Button,
  colors,
  IExtendedColumn,
  Popover,
  shadows,
  Table,
  Text,
  Title,
  withCellLoading,
} from '@novu/design-system';
import { IntegrationChannel } from '../IntegrationChannel';
import { IntegrationEnvironmentPill } from '../IntegrationEnvironmentPill';
import { useFetchEnvironments } from '../../../../hooks/useFetchEnvironments';
import { CHANNEL_TYPE_TO_STRING } from '../../../../utils/channels';
import { useIntegrations } from '../../../../hooks';
import { IntegrationEntity, ITableIntegration } from '../../types';
import { mapToTableIntegration } from '../../utils';
import { IntegrationStatusCell } from '../IntegrationStatusCell';
import { IntegrationNameCell } from '../IntegrationNameCell';
import { useMakePrimaryIntegration } from '../../../../api/hooks/useMakePrimaryIntegration';
import { When } from '../../../../components/utils/When';

const ModalBodyHolder = styled.div`
  display: flex;
  width: 100%;
  flex-direction: column;
  justify-content: flex-end;
  gap: 16px;

  & [data-table-holder] {
    min-height: initial !important;
    overflow-x: hidden;
    overflow-y: auto;
    max-height: 70vh;
    padding-right: 5px;

    @media screen and (max-width: 1366px) {
      max-height: 400px;
    }
  }
`;

const Description = styled(Text)`
  color: ${colors.B60};
  font-size: 14px;
  line-height: 20px;
`;

const Warning = styled(Text)`
  color: ${colors.error};
  font-size: 14px;
  line-height: 20px;
`;

const MetaHolder = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
`;

const ButtonsHolder = styled.div`
  display: flex;
  justify-content: flex-end;
  align-items: flex-end;
  gap: 24px;
  flex: 1 0 0;
  margin-top: 14px;
`;

const columns: IExtendedColumn<ITableIntegration>[] = [
  {
    accessor: 'name',
    Header: 'Name',
    Cell: IntegrationNameCell,
  },
  {
    accessor: 'provider',
    Header: 'Provider',
    Cell: withCellLoading(
      ({ row: { original } }) => {
        return (
          <Text data-test-id="integration-provider-cell" rows={1}>
            {original.provider}
          </Text>
        );
      },
      { loadingTestId: 'integration-provider-cell-loading' }
    ),
  },
  {
    accessor: 'active',
    Header: 'Status',
    width: 125,
    maxWidth: 125,
    Cell: IntegrationStatusCell,
  },
];

const initialState: {
  selectedIntegrationId?: string;
  isActive: boolean;
  selectedRowId?: string;
  isPopoverOpened: boolean;
} = { isActive: true, isPopoverOpened: false };

export interface ISelectPrimaryIntegrationModalProps {
  isOpened: boolean;
  environmentId?: string;
  channelType?: ChannelTypeEnum;
  exclude?: (integration: IntegrationEntity) => boolean;
  onClose: () => void;
}

export const SelectPrimaryIntegrationModal = ({
  isOpened,
  environmentId,
  channelType = ChannelTypeEnum.EMAIL,
  exclude,
  onClose,
}: ISelectPrimaryIntegrationModalProps) => {
  const theme = useMantineTheme();
  const [{ selectedIntegrationId, isActive, selectedRowId, isPopoverOpened }, setSelectedState] =
    useState(initialState);

  const { environments, isLoading: areEnvironmentsLoading } = useFetchEnvironments();
  const environmentName = environments?.find((el) => el._id === environmentId)?.name ?? '';

  const onCloseCallback = useCallback(() => {
    setSelectedState(initialState);
    onClose();
  }, [onClose]);

  const { integrations, loading: areIntegrationsLoading } = useIntegrations();
  const { makePrimaryIntegration, isLoading: isMarkingPrimaryIntegration } = useMakePrimaryIntegration({
    onSuccess: () => onCloseCallback(),
  });
  const integrationsByEnvAndChannel = useMemo<ITableIntegration[]>(() => {
    const filteredIntegrations = (integrations ?? []).filter((el) => {
      let isNotExcluded = true;
      if (exclude) {
        isNotExcluded = !exclude(el);
      }

      if (environmentId) {
        return el.channel === channelType && el._environmentId === environmentId && isNotExcluded;
      }

      return el.channel === channelType && isNotExcluded;
    });

    return filteredIntegrations.map((el) => mapToTableIntegration(el, environments));
  }, [integrations, environments, channelType, environmentId, exclude]);

  const initialSelectedIndex = useMemo(() => {
    const primary = integrationsByEnvAndChannel.find((el) => el.primary);
    if (primary) {
      return integrationsByEnvAndChannel.indexOf(primary ?? {});
    }

    return -1;
  }, [integrationsByEnvAndChannel]);

  const isLoading = areEnvironmentsLoading || areIntegrationsLoading;
  const isInitialProviderSelected = !selectedRowId || selectedRowId === `${initialSelectedIndex}`;
  const makePrimaryButtonDisabled = !selectedIntegrationId || isLoading || isInitialProviderSelected;
  const channelName = CHANNEL_TYPE_TO_STRING[channelType];

  const onRowSelectCallback = (row: Row<ITableIntegration>) => {
    setSelectedState((old) => ({
      ...old,
      selectedIntegrationId: row.original.integrationId,
      isActive: row.original.active,
      selectedRowId: row.id,
    }));
  };

  return (
    <Modal
      opened={isOpened}
      withinPortal
      overlayColor={theme.colorScheme === 'dark' ? colors.BGDark : colors.BGLight}
      overlayOpacity={0.7}
      styles={{
        root: {
          backdropFilter: 'blur(10px)',
        },
        modal: {
          backgroundColor: theme.colorScheme === 'dark' ? colors.B15 : colors.white,
          width: 800,
          '@media (max-width: 1366px)': {
            maxHeight: '650px',
          },
        },
        inner: {
          alignItems: 'center',
        },
        header: {
          marginBottom: '16px',
        },
      }}
      title={<Title size={2}>Select primary provider</Title>}
      shadow={theme.colorScheme === 'dark' ? shadows.dark : shadows.medium}
      radius="md"
      size="lg"
      onClose={() => onCloseCallback()}
    >
      <ModalBodyHolder data-test-id="select-primary-integration-modal">
        <Description>
          {`Please select the primary provider instance within the ${channelName.toLowerCase()} ` +
            `channel in the ${environmentName.toLowerCase()} environment.`}
        </Description>
        <MetaHolder>
          <IntegrationEnvironmentPill
            name={environmentName}
            testId="integration-environment-pill"
            isLoading={isLoading}
          />
          <IntegrationChannel
            type={channelType}
            name={channelName}
            sameColor
            isLoading={isLoading}
            testId="integration-channel-cell"
          />
        </MetaHolder>
        <When truthy={isLoading}>
          <Table loading loadingItems={5} data-test-id="integrations-list-table" columns={columns} withSelection />
        </When>
        <When truthy={!isLoading}>
          <Table
            data-test-id="integrations-list-table"
            columns={columns}
            data={integrationsByEnvAndChannel}
            withSelection
            onRowSelect={onRowSelectCallback}
            initialSelectedRows={initialSelectedIndex > -1 ? { [initialSelectedIndex]: true } : undefined}
          />
        </When>
        <ButtonsHolder>
          {!isActive && !isInitialProviderSelected && (
            <Warning>
              The selected provider instance will be activated as the primary provider can not be disabled.
            </Warning>
          )}
          <Button variant="outline" onClick={onCloseCallback}>
            Cancel
          </Button>
          <Popover
            opened={isPopoverOpened && isInitialProviderSelected}
            withArrow
            withinPortal
            offset={5}
            transitionDuration={300}
            position="top"
            width={230}
            styles={{ dropdown: { minHeight: 'initial !important' } }}
            content={<Description>The selected provider instance is already the primary provider</Description>}
            target={
              <span
                onMouseEnter={() => setSelectedState((old) => ({ ...old, isPopoverOpened: true }))}
                onMouseLeave={() => setSelectedState((old) => ({ ...old, isPopoverOpened: false }))}
              >
                <Button
                  loading={isMarkingPrimaryIntegration}
                  disabled={makePrimaryButtonDisabled}
                  onClick={() => makePrimaryIntegration({ id: selectedIntegrationId ?? '' })}
                  data-test-id="make-primary-button"
                >
                  Make primary
                </Button>
              </span>
            }
          />
        </ButtonsHolder>
      </ModalBodyHolder>
    </Modal>
  );
};
