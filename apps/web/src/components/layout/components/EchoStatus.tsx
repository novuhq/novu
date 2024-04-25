import { Badge, Text } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../../api/api.client';
import { useEnvController } from '../../../hooks';
import { Tooltip, Popover } from '@novu/design-system';
import { useDisclosure } from '@mantine/hooks';
import { IS_DOCKER_HOSTED } from '@novu/shared-web';

export function EchoStatus() {
  const [opened, { close, open }] = useDisclosure(false);

  const { environment } = useEnvController();
  const echoEnabled = !!environment?.echo?.url && !IS_DOCKER_HOSTED;
  const { data, error, isInitialLoading } = useQuery<{
    status: 'ok' | 'down';
    version: string;
    discovered: { workflows: number };
  }>(
    ['/v1/echo/status'],
    () => {
      return api.get('/v1/echo/status');
    },
    {
      enabled: echoEnabled,
      refetchInterval: 5000,
      refetchOnWindowFocus: true,
    }
  );

  if (IS_DOCKER_HOSTED) {
    return null;
  }

  if (!echoEnabled) return null;

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
          Echo
        </Badge>
      }
      title={'Echo Status'}
      content={<PopoverContent status={status} url={environment?.echo?.url} />}
    ></Popover>
  );
}

function PopoverContent({ url, status }) {
  if (status !== 'ok') {
    return (
      <>
        <Text>
          <b>Status</b>: {status === 'ok' ? 'Echo Is Up' : 'Echo is Down'}
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
        <b>Status</b>: Echo Is Up
      </Text>
      <Text>
        <b>URL</b>: {url}
      </Text>
    </>
  );
}
