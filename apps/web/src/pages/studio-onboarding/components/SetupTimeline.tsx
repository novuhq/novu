import { CodeSnippet } from '../../get-started/components/CodeSnippet';
import { Timeline as MantineTimeline } from '@mantine/core';
import { useMemo, useState } from 'react';
import { Input } from '@novu/design-system';
import { IconCheck } from '@novu/novui/icons';
import { useQuery } from '@tanstack/react-query';
import { When } from '../../../components/utils/When';
import { getApiKeys } from '../../../api/environment';
import { Text } from '@novu/novui';
import { Timeline } from '../../../components/Timeline/index';
import { css } from '@novu/novui/css';

const Icon = () => (
  <IconCheck
    className={css({
      color: 'typography.text.main !important',
    })}
  />
);

export const SetupTimeline = ({
  error,
  url,
  setUrl,
  isLoading,
}: {
  error: string;
  url: string;
  setUrl: (url: string) => void;
  isLoading: boolean;
}) => {
  const { data: apiKeys = [] } = useQuery<{ key: string }[]>(['getApiKeys'], getApiKeys);
  const key = useMemo(() => apiKeys[0]?.key, [apiKeys]);
  const [active, setActive] = useState(0);

  return (
    <Timeline>
      <MantineTimeline.Item
        bullet={active >= 1 ? <Icon /> : 1}
        lineVariant="dashed"
        title="Create Novu App"
        active={active >= 1}
      >
        <CodeSnippet
          command={`npx create-novu-app --api-key=${key}`}
          onClick={() => {
            setActive((old) => (old > 1 ? old : 1));
          }}
        />
      </MantineTimeline.Item>
      <MantineTimeline.Item
        bullet={active >= 2 ? <Icon /> : 2}
        lineVariant="dashed"
        title="Start your application"
        active={active >= 2}
      >
        <CodeSnippet
          command={'cd my-app && npm run dev'}
          onClick={() => {
            setActive((old) => (old > 2 ? old : 2));
          }}
        />
      </MantineTimeline.Item>
      <MantineTimeline.Item
        bullet={active >= 3 ? <Icon /> : 3}
        lineVariant="dashed"
        title="Connect to the endpoint"
        active={active >= 3}
      >
        <When truthy={isLoading}>
          <Text variant="main" color="typography.text.secondary">
            Processing...
          </Text>
        </When>
        <When truthy={!isLoading}>
          <Text variant="main" color="typography.text.secondary">
            Enter endpoint URL
          </Text>
          <Input
            type="url"
            onChange={(e) => {
              setUrl(e.target.value);
            }}
            value={url}
            error={error}
          />
        </When>
      </MantineTimeline.Item>
    </Timeline>
  );
};
