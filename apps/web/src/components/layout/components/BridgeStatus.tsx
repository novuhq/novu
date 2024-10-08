import { Badge, Text } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { Popover } from '@novu/design-system';
import { useDisclosure } from '@mantine/hooks';
import { api } from '../../../api/api.client';
import { useEnvironment } from '../../../hooks';
import { IS_SELF_HOSTED } from '../../../config';

export function BridgeStatus() {
  const [opened, { close, open }] = useDisclosure(false);

  const { environment } = useEnvironment();
  const isBridgeEnabled = !!environment?.echo?.url && !IS_SELF_HOSTED;
  const { data, error, isInitialLoading } = useQuery<{
    status: 'ok' | 'down';
    version: string;
    discovered: { workflows: number };
  }>(
    ['/v1/bridge/status'],
    () => {
      return api.get('/v1/bridge/status');
    },
    {
      enabled: isBridgeEnabled,
      refetchInterval: 5000,
      refetchOnWindowFocus: true,
    }
  );

  if (IS_SELF_HOSTED) {
    return null;
  }

  if (!isBridgeEnabled) return null;

  const status = data?.status === 'ok' && !error ? 'ok' : 'down';
  let color = status === 'ok' ? 'green' : 'red';
  if (isInitialLoading) {
    color = 'yellow';
  }

  return (
    <Popover
      opened={opened}
      titleGradient={status === 'ok' ? 'blue' : undefined}
      position={'bottom'}
      target={
        <Badge color={color} variant="outline" onMouseEnter={open} onMouseLeave={close}>
          Bridge
        </Badge>
      }
      title={'Bridge Status'}
      content={<PopoverContent status={status} url={environment?.echo?.url} />}
    ></Popover>
  );
}

function PopoverContent({ url, status }) {
  if (status !== 'ok') {
    return (
      <>
        <Text>
          <b>Status</b>: {status === 'ok' ? 'Connected to your application' : 'Disconnected from your application'}
        </Text>
        <Text>
          <b>URL</b>: {url}
        </Text>
      </>
    );
  }

  return (
    <>
      <Text>
        <b>Status</b>: Bridge Is Up
      </Text>
      <Text>
        <b>URL</b>: {url}
      </Text>
    </>
  );
}
