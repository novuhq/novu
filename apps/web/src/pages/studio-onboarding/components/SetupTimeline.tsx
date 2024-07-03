import { CodeSnippet } from '../../get-started/components/CodeSnippet';
import { Loader, Timeline as MantineTimeline } from '@mantine/core';
import { useEffect, useState } from 'react';
import { IconCheck } from '@novu/novui/icons';
import { Text } from '@novu/novui';
import { css } from '@novu/novui/css';
import { BridgeStatus } from '../../../bridgeApi/bridgeApi.client';
import { useColorScheme } from '@novu/design-system';
import { useStudioState } from '../../../studio/StudioStateProvider';
import { timelineRecipe } from './SetupTimeline.recipe';

const Icon = () => (
  <IconCheck
    className={css({
      color: {
        base: 'surface.page !important',
        _dark: 'typography.text.main !important',
      },
    })}
  />
);

export const SetupTimeline = ({ testResponse }: { testResponse: { isLoading: boolean; data: BridgeStatus } }) => {
  const { devSecretKey } = useStudioState();
  const [active, setActive] = useState(0);
  const { colorScheme } = useColorScheme();

  useEffect(() => {
    if (testResponse?.isLoading || testResponse?.data?.status !== 'ok') {
      return;
    }
    setActive(3);
  }, [testResponse?.data?.status, testResponse?.isLoading]);

  function CheckStatusIcon() {
    return (
      <>
        {testResponse?.isLoading || testResponse?.data?.status !== 'ok' ? (
          <Loader size={16} color={colorScheme === 'dark' ? 'white' : 'dark'} />
        ) : (
          <Icon />
        )}
      </>
    );
  }

  return (
    <MantineTimeline classNames={timelineRecipe()} lineWidth={1} bulletSize={32}>
      <MantineTimeline.Item
        bullet={active >= 1 ? <Icon /> : 1}
        lineVariant="dashed"
        title="Create Novu Example App"
        active={active >= 1}
      >
        <Text variant="main" color="typography.text.secondary">
          This will create a new Next.js sample app with React-Email
        </Text>
        <CodeSnippet
          command={`npx create-novu-app@latest --secret-key=${devSecretKey}`}
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
          command={'cd my-novu-app && npm run dev'}
          onClick={() => {
            setActive((old) => (old > 2 ? old : 2));
          }}
        />
      </MantineTimeline.Item>
      <MantineTimeline.Item
        bullet={<CheckStatusIcon />}
        lineVariant="dashed"
        title="Connect to the Novu Bridge app"
        active={active >= 3}
      >
        <Text variant="main" color="typography.text.secondary">
          {active < 3 ? 'Waiting for you to start the application' : 'Successfully connected to the Novu Bridge app'}
        </Text>
      </MantineTimeline.Item>
    </MantineTimeline>
  );
};
