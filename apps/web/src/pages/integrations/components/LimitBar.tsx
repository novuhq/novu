import styled from '@emotion/styled/macro';
import { Stack, useMantineColorScheme } from '@mantine/core';
import { ChannelTypeEnum } from '@novu/shared';
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { When } from '../../../components/utils/When';
import { colors, Text } from '../../../design-system';

const WARNING_LIMIT = {
  [ChannelTypeEnum.EMAIL]: 50,
  [ChannelTypeEnum.SMS]: 5,
};

export const LimitBar = ({
  withLink = false,
  channel = ChannelTypeEnum.EMAIL,
  showDescription,
  limit,
  count,
  loading,
}: {
  withLink?: boolean;
  channel?: ChannelTypeEnum;
  showDescription?: boolean;
  limit: number;
  count: number;
  loading: boolean;
}) => {
  if (channel !== ChannelTypeEnum.EMAIL && channel !== ChannelTypeEnum.SMS) {
    return null;
  }

  if (loading) {
    return null;
  }

  if (withLink) {
    return (
      <Link to="/integrations">
        <LimitBarBase limit={limit} count={count} channel={channel} showDescription={showDescription} />
      </Link>
    );
  }

  return <LimitBarBase limit={limit} count={count} channel={channel} showDescription={showDescription} />;
};

const LimitBarBase = ({
  limit,
  count,
  channel = ChannelTypeEnum.EMAIL,
  showDescription,
}: {
  limit: number;
  count: number;
  channel?: ChannelTypeEnum;
  showDescription?: boolean;
}) => {
  const unit = useMemo<string>(() => {
    return channel === ChannelTypeEnum.EMAIL ? 'emails' : 'messages';
  }, [channel]);
  const { colorScheme } = useMantineColorScheme();

  const isDark = colorScheme === 'dark';

  const descriptionColor = isDark ? colors.B60 : colors.B40;

  const warningLimit = WARNING_LIMIT[channel];

  return (
    <Stack spacing={2} sx={{ color: colors.B60 }}>
      <div>
        <Text>
          {count}
          <span
            style={{
              color: descriptionColor,
            }}
          >
            {' '}
            {unit} left
          </span>
        </Text>

        <ProgressContainer>
          <ProgressBar count={count} limit={limit} warningLimit={warningLimit} />
        </ProgressContainer>
        <When truthy={showDescription}>
          <Text color={descriptionColor}>
            To send more {unit}, configure a different {channel} provider
          </Text>
        </When>
      </div>
    </Stack>
  );
};

const ProgressContainer = styled.div`
  height: 2px;
  width: 100%;
  position: relative;
  border-radius: 3px;
  background: ${({ theme }) => (theme.colorScheme === 'dark' ? colors.B30 : colors.B60)};
  margin-top: 6px;
  margin-bottom: 6px;
  overflow: hidden;
`;

const ProgressBar = styled.div<{ count: number; limit: number; warningLimit: number }>`
  border-radius: '3px';
  background: ${({ count, warningLimit }) => (count > warningLimit ? colors.success : colors.error)};
  height: 2px;
  width: ${({ count, limit }) => (100 * count) / limit}%;
`;
