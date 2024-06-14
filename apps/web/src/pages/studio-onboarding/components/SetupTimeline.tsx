import { CodeSnippet } from '../../get-started/components/CodeSnippet';
import { Timeline } from '../../get-started/components/timeline/Timeline';
import { useMemo, useState } from 'react';
import { Input } from '@novu/design-system';
import { IconCheck } from '@novu/novui/icons';
import { useQuery } from '@tanstack/react-query';
import { When } from '../../../components/utils/When';
import { getApiKeys } from '../../../api/environment';
import { Text } from '@novu/novui';

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
    <Timeline
      active={active}
      steps={[
        {
          title: 'Create Novu App',
          Description: () => (
            <CodeSnippet
              command={`npx create-novu app --api-key=${key}`}
              onClick={() => {
                setActive((old) => (old > 1 ? old : 1));
              }}
            />
          ),
          bullet: active >= 1 ? <IconCheck /> : null,
        },
        {
          title: 'Start your application',
          Description: () => (
            <CodeSnippet
              command={'cd my-app && npm run dev'}
              onClick={() => {
                setActive((old) => (old > 2 ? old : 2));
              }}
            />
          ),
          bullet: active >= 2 ? <IconCheck /> : null,
        },
        {
          title: 'Connect to the endpoint',
          Description: () => (
            <>
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
            </>
          ),
          bullet: active >= 3 ? <IconCheck /> : null,
        },
      ]}
    />
  );
};
