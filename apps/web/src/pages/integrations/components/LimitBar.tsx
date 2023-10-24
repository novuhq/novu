import styled from '@emotion/styled/macro';
import { Stack, useMantineColorScheme } from '@mantine/core';
import { ChannelTypeEnum } from '@novu/shared';
import { Link } from 'react-router-dom';
import { When } from '../../../components/utils/When';
import { colors, Text } from '@novu/design-system';

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
  const unit = channel === ChannelTypeEnum.EMAIL ? 'emails' : 'messages';

  const { colorScheme } = useMantineColorScheme();

  const isDark = colorScheme === 'dark';

  const descriptionColor = isDark ? colors.B60 : colors.B40;

  const warningLimit = WARNING_LIMIT[channel];
  const limitLeft = limit - count;

  return (
    <Stack spacing={2} sx={{ color: colors.B60 }}>
      <div>
        <Text data-test-id="limitbar-limit">
          {limitLeft}
          <span
            style={{
              color: descriptionColor,
            }}
          >
            {' '}
            {limitLeft === limit ? `${unit} per month` : `${unit} left`}
          </span>
        </Text>

        <ProgressContainer>
          <ProgressBar limitLeft={limitLeft} limit={limit} warningLimit={warningLimit} />
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

const ProgressBar = styled.div<{ limitLeft: number; limit: number; warningLimit: number }>`
  border-radius: '3px';
  background: ${({ limitLeft, warningLimit }) => (limitLeft > warningLimit ? colors.success : colors.error)};
  height: 2px;
  width: ${({ limitLeft, limit }) => (100 * limitLeft) / limit}%;
`;
