import { InfoCircleFilled } from '@ant-design/icons';
import { ChannelTypeEnum } from '@novu/shared';
import { Stack, useMantineColorScheme } from '@mantine/core';
import { colors, Tooltip } from '../../../design-system';
import { useIntegrationLimit } from '../../../api/hooks/integrations/use-integration-limit';
import { When } from '../../../components/utils/When';
import { useActiveIntegrations } from '../../../api/hooks/integrations/use-active-integrations';

export const LimitBar = () => {
  const selfHosted = process.env.REACT_APP_DOCKER_HOSTED_ENV === 'true';
  const { limit } = useIntegrationLimit(ChannelTypeEnum.EMAIL);
  const { colorScheme } = useMantineColorScheme();
  const { integrations = [] } = useActiveIntegrations();

  return (
    <When
      truthy={
        selfHosted && integrations.filter((integration) => integration.channel === ChannelTypeEnum.EMAIL).length === 0
      }
    >
      <Stack spacing={2}>
        <div
          style={{
            textAlign: 'center',
          }}
        >
          Novu email credits used{' '}
          <Tooltip
            label={
              <>
                You now can send up to {limit.limit} emails
                <br /> without even connecting a provider!
              </>
            }
          >
            <InfoCircleFilled />
          </Tooltip>
        </div>
        <div
          style={{
            padding: '2px',
            border: `1px solid ${colorScheme === 'dark' ? colors.B60 : colors.B70}`,
            borderRadius: '7px',
            width: '200px',
            position: 'relative',
          }}
        >
          <div
            style={{
              borderRadius: '7px',
              background: colors.horizontal,
              height: '21px',
              width: `${(100 * limit.count) / limit.limit}%`,
            }}
          ></div>
          <div
            style={{
              position: 'absolute',
              top: '0',
              left: '0',
              right: '0',
              bottom: '0',
              textAlign: 'center',
              lineHeight: '25px',
            }}
          >
            {limit.count}/{limit.limit} emails left
          </div>
        </div>
      </Stack>
    </When>
  );
};
