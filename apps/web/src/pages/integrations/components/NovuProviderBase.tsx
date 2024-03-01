import React from 'react';
import styled from '@emotion/styled';
import { Stack, Text, useMantineColorScheme } from '@mantine/core';
import { ChannelTypeEnum, UTM_CAMPAIGN_QUERY_PARAM } from '@novu/shared';
import { colors, Close } from '@novu/design-system';

import { When } from '../../../components/utils/When';
import { CONTEXT_PATH } from '../../../config';
import { useIntegrationLimit } from '../../../hooks';
import { LimitBar } from './LimitBar';

interface NovuProviderBaseProps {
  onClose: () => void;
  senderInformation?: React.ReactNode;
  channel: ChannelTypeEnum;
}

export function NovuProviderBase({ onClose, senderInformation, channel }: NovuProviderBaseProps) {
  const {
    data: { limit, count },
    loading,
  } = useIntegrationLimit(channel);

  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === 'dark';

  const logoSrc = isDark ? CONTEXT_PATH + '/static/images/logo-light.png' : CONTEXT_PATH + '/static/images/logo.png';

  const unit = channel === ChannelTypeEnum.EMAIL ? 'emails' : 'messages';

  return (
    <div
      style={{
        position: 'relative',
        padding: '18px',
      }}
    >
      <CloseButton data-test-id="connection-integration-form-close" type="button" onClick={onClose}>
        <Close />
      </CloseButton>

      <Stack spacing={24}>
        <div>
          <img src={logoSrc} alt="logo" style={{ maxWidth: 130, maxHeight: 32 }} />
        </div>
        <Stack spacing={24}>
          <Stack spacing={16}>
            <Text>
              The free Novu provider allows sending {limit} {unit} per month
            </Text>
            <LimitBar channel={channel} limit={limit} count={count} loading={loading} showDescription />
          </Stack>
          <When truthy={senderInformation}>{senderInformation}</When>
          <InlineDiv>
            <span>Read more about Integrations in</span>
            <a
              href={`https://docs.novu.co/channels-and-providers/integration-store${UTM_CAMPAIGN_QUERY_PARAM}`}
              target="_blank"
              rel="noreferrer"
              style={{ color: '#DD2476 ', textDecoration: 'underline' }}
            >
              our docs
            </a>
          </InlineDiv>
        </Stack>
      </Stack>
    </div>
  );
}

const ColumnDiv = styled.div`
  display: flex;
  flex-direction: column;
`;

const InlineDiv = styled.div`
  display: inline;
  span {
    margin-right: 5px;
  }
`;

const CloseButton = styled.button`
  position: absolute;
  right: 0;
  top: 0;
  background: transparent;
  border: none;
  color: ${colors.B40};
  outline: none;

  &:hover {
    cursor: pointer;
  }
`;
