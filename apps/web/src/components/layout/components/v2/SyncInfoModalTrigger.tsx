import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import CryptoJS from 'crypto-js';
import styled from '@emotion/styled';

import { colors, Tooltip, useColorScheme } from '@novu/design-system';
import { Button, Text } from '@novu/novui';
import { IconOutlineCloudUpload } from '@novu/novui/icons';
import { css } from '@novu/novui/css';

import { useTelemetry } from '../../../../hooks/useNovuAPI';
import { SyncInfoModal } from './SyncInfoModal';
import { useDiscover } from '../../../../studio/hooks';
import { getNotificationsList } from '../../../../api/notification-templates';
import { When } from '../../../utils/When';

export function SyncInfoModalTrigger() {
  const [showSyncInfoModal, setShowSyncInfoModal] = useState(false);
  const { data: bridgeDiscoverData, isLoading: isLoadingBridgeWorkflows } = useDiscover();
  const {
    data: originData,
    isLoading: isLoadingOriginWorkflows,
    refetch,
  } = useQuery(
    ['origin-workflows'],
    async () => {
      return getNotificationsList({ page: 0, limit: 100 });
    },
    {}
  );

  const isSynced = useMemo(() => {
    if (isLoadingBridgeWorkflows || isLoadingOriginWorkflows) {
      return true;
    }

    const bridgeDiscoverWorkflows = bridgeDiscoverData?.workflows || undefined;
    const originWorkflows = originData?.data.map((workflow) => workflow.rawData) || undefined;

    const bridgeDiscoverWorkflowsHash = createHash(bridgeDiscoverWorkflows);
    const storedWorkflowsHash = createHash(originWorkflows);

    return storedWorkflowsHash === bridgeDiscoverWorkflowsHash;
  }, [bridgeDiscoverData, originData, isLoadingBridgeWorkflows, isLoadingOriginWorkflows]);

  const track = useTelemetry();

  const toggleSyncInfoModalShow = () => {
    setShowSyncInfoModal((previous) => !previous);
    track('Workflow sync button clicked - [Studio]');
  };

  return (
    <>
      <Tooltip
        disabled={isSynced}
        width="auto"
        label={<Text>You have un-synced changes in your local application.</Text>}
        withinPortal
      >
        <Container>
          <Button size="xs" Icon={IconOutlineCloudUpload} onClick={toggleSyncInfoModalShow}>
            Sync
          </Button>
          <When truthy={!isSynced}>
            <Dot />
          </When>
        </Container>
      </Tooltip>

      {/** TODO: use a modal manager */}
      <SyncInfoModal isOpen={showSyncInfoModal} toggleOpen={toggleSyncInfoModalShow} refetchOriginWorkflows={refetch} />
    </>
  );
}

function createHash(workflowDefine) {
  return CryptoJS.SHA256(JSON.stringify(workflowDefine || '')).toString(CryptoJS.enc.Hex);
}

export function GradientDot(props) {
  const { colorScheme } = useColorScheme();

  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none" {...props}>
      <rect
        x="1.5"
        y="1.5"
        width="13"
        height="13"
        rx="6.5"
        fill="url(#paint0_linear_1722_2699)"
        stroke={colorScheme === 'light' ? colors.white : colors.B15}
        strokeWidth="3"
      />
      <defs>
        <linearGradient id="paint0_linear_1722_2699" x1="8" y1="13" x2="8" y2="3" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FF512F" />
          <stop offset="1" stopColor="#DD2476" />
        </linearGradient>
      </defs>
    </svg>
  );
}

const Container = styled.div`
  position: relative;
`;

const Dot = styled(GradientDot)`
  position: absolute;
  top: -3px;
  right: -3px;
  width: 12px;
  height: 12px;
`;
