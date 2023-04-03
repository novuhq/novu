import { useMemo } from 'react';
import { ChannelTypeEnum } from '@novu/shared';
import { Stack } from '@mantine/core';
import { colors, Tooltip } from '../../../design-system';
import { useIntegrationLimit } from '../../../hooks';
import styled from '@emotion/styled/macro';
import { Link } from 'react-router-dom';

export const LimitBar = ({
  withLink = false,
  channel = ChannelTypeEnum.EMAIL,
  label = null,
}: {
  withLink?: boolean;
  channel?: ChannelTypeEnum;
  label?: string | null;
}) => {
  const {
    data: { limit, count },
    loading,
    isLimitFetchingEnabled,
  } = useIntegrationLimit(channel);

  if (channel !== ChannelTypeEnum.EMAIL && channel !== ChannelTypeEnum.SMS) {
    return null;
  }

  if (loading || !isLimitFetchingEnabled) {
    return null;
  }

  if (withLink) {
    return (
      <Link to="/integrations">
        <LimitBarBase limit={limit} count={count} channel={channel} label={label} />
      </Link>
    );
  }

  return <LimitBarBase limit={limit} count={count} channel={channel} label={label} />;
};

const LimitBarBase = ({
  limit,
  count,
  channel = ChannelTypeEnum.EMAIL,
  label = null,
}: {
  limit: number;
  count: number;
  channel?: ChannelTypeEnum;
  label?: string | null;
}) => {
  const unit = useMemo<string>(() => {
    return channel === ChannelTypeEnum.EMAIL ? 'emails' : 'sms';
  }, [channel]);

  return (
    <Stack spacing={2} sx={{ color: colors.B60 }}>
      <Tooltip
        label={
          <>
            You now can send up to {limit} {unit}
            <br /> without even connecting a provider!
          </>
        }
      >
        <div>
          {label}
          <ProgressContainer>
            <ProgressBar count={count} limit={limit} />
          </ProgressContainer>
          {count}/{limit} {unit} left
        </div>
      </Tooltip>
    </Stack>
  );
};

const ProgressContainer = styled.div`
  height: 9px;
  width: 200px;
  position: relative;
  border-radius: 3px;
  background: ${({ theme }) => (theme.colorScheme === 'dark' ? colors.B30 : colors.B60)};
  margin-top: 6px;
  margin-bottom: 6px;
  overflow: hidden;
`;

const ProgressBar = styled.div<{ count: number; limit: number }>`
  border-radius: '3px';
  background: ${colors.horizontal};
  height: 9px;
  width: ${({ count, limit }) => (100 * count) / limit}%;
`;
