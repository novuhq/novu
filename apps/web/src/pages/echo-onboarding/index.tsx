import { css } from '@novu/novui/css';
import { vstack } from '@novu/novui/patterns';
import { Footer } from './components/Footer';
import { Header } from './components/header';
import { text, title } from '@novu/novui/recipes';
import { styled } from '@novu/novui/jsx';
import { CodeSnippet } from '../get-started/components/CodeSnippet';
import { Timeline } from '../get-started/components/timeline/Timeline';
import { useState } from 'react';
import { IconCheck } from '@novu/design-system';
import { getApiKeys } from '@novu/shared-web';
import { useQuery } from '@tanstack/react-query';

const Heading = styled('h1', title);
const Text = styled('p', text);

export const EchoOnboarding = () => {
  const [active, setActive] = useState(0);
  const { data: apiKeys } = useQuery<{ key: string }[]>(['getApiKeys'], getApiKeys);

  return (
    <>
      <Header />
      <div className={vstack({ alignContent: 'center' })}>
        <div
          className={css({
            width: '680px',
          })}
        >
          <Heading>Create an Echo endpoint</Heading>
          <Text className={css({ color: 'typography.text.secondary', lineHeight: '150', marginBottom: '150' })}>
            The first step adds an Echo endpoint, and creates your first workflow automatically. The workflow will be
            created with an email step with sample content.
          </Text>
          <Timeline
            active={active}
            steps={[
              {
                title: 'Create Echo App',
                Description: () => (
                  <CodeSnippet
                    command={'npx create-echo app --api-key=yr786zdc76vsd78f687dzf678d'}
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
                title: 'Connect to the Echo endpoint',
                Description: () => (
                  <Text className={css({ color: 'typography.text.secondary', lineHeight: '150' })}>
                    We auto-detect URL on server startup. The endpoint is predetermined by us. This step is about
                    connecting to it and verifying the setup.
                  </Text>
                ),
                bullet: active >= 3 ? <IconCheck /> : null,
              },
            ]}
          />
        </div>
      </div>
      <Footer buttonDisabled={active !== 3} />
    </>
  );
};
