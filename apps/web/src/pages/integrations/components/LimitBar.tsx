import { ChannelTypeEnum } from '@novu/shared';
import { Stack } from '@mantine/core';
import { colors, Tooltip } from '../../../design-system';
import { useIntegrationLimit } from '../../../api/hooks/integrations/use-integration-limit';
import styled from '@emotion/styled/macro';
import { Link } from 'react-router-dom';

export const LimitBar = ({ withLink = false }: { withLink?: boolean }) => {
  const {
    limit: { limit, count } = { limit: 0, count: 0 },
    loading,
    enabled,
  } = useIntegrationLimit(ChannelTypeEnum.EMAIL);

  if (loading || !enabled) {
    return null;
  }

  if (withLink) {
    return (
      <Link to="/integrations">
        <LimitBarBase limit={limit} count={count} />
      </Link>
    );
  }

  return <LimitBarBase limit={limit} count={count} />;
};

const LimitBarBase = ({ limit, count }: { limit: number; count: number }) => {
  return (
    <Stack spacing={2} sx={{ color: colors.B60 }}>
      <Tooltip
        label={
          <>
            You now can send up to {limit} emails
            <br /> without even connecting a provider!
          </>
        }
      >
        <div>
          Novu email credits used
          <ProgressContainer>
            <ProgressBar count={count} limit={limit} />
          </ProgressContainer>
          {count}/{limit} emails left
        </div>
      </Tooltip>
    </Stack>
  );
};

const ProgressContainer = styled.div`
  height: 3px;
  width: 200px;
  position: relative;
  border-radius: 3px;
  background: ${({ theme }) => (theme.colorScheme === 'dark' ? colors.B30 : colors.B60)};
  margin-top: 6px;
  margin-bottom: 6px;
`;

const ProgressBar = styled.div<{ count: number; limit: number }>`
  border-radius: '3px';
  background: ${colors.horizontal};
  height: 3px;
  width: ${({ count, limit }) => (100 * count) / limit}%;
`;
