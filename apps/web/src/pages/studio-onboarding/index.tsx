import { css } from '@novu/novui/css';
import { vstack } from '@novu/novui/patterns';
import { Footer } from './components/Footer';
import { Header } from './components/Header';
import { text, title } from '@novu/novui/recipes';
import { styled } from '@novu/novui/jsx';
import { CodeSnippet } from '../get-started/components/CodeSnippet';
import { Timeline } from '../get-started/components/timeline/Timeline';
import { useMemo, useState } from 'react';
import { Input } from '@novu/design-system';
import { IconCheck } from '@novu/novui/icons';
import { getApiKeys, ROUTES } from '@novu/shared-web';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { When } from '../../components/utils/When';

const Heading = styled('h1', title);
const Text = styled('p', text);

export const StudioOnboarding = () => {
  const [active, setActive] = useState(0);
  const { data: apiKeys = [] } = useQuery<{ key: string }[]>(['getApiKeys'], getApiKeys);
  const key = useMemo(() => apiKeys[0]?.key, [apiKeys]);
  const navigate = useNavigate();
  const [url, setUrl] = useState('http://localhost:9999/echo');
  const [error, setError] = useState('');
  const { isLoading, mutate } = useMutation(
    async () => {
      try {
        new URL(url);
      } catch (e) {
        throw new Error('The provided URL is invalid');
      }

      try {
        const response = await fetch(url + '?action=health-check');

        return response.json();
      } catch (e) {
        throw new Error('This is not the Novu endpoint URL');
      }
    },
    {
      onSuccess: (data) => {
        if (!data.discovered.workflows && !data.discovered.steps) {
          setError('This is not the Novu endpoint URL');

          return;
        }
        localStorage.setItem('studio-onboarding', url);
        navigate(ROUTES.STUDIO_ONBOARDING_TEST);
      },
      onError: (e) => {
        setError((e as Error).message);
      },
    }
  );

  return (
    <div
      className={css({
        width: '100dvw',
        height: '100dvh',
      })}
    >
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
                    command={`npx create-echo app --api-key=${key}`}
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
                  <>
                    <When truthy={isLoading}>
                      <Text className={css({ color: 'typography.text.secondary', lineHeight: '150' })}>
                        Processing...
                      </Text>
                    </When>
                    <When truthy={!isLoading}>
                      <Text className={css({ color: 'typography.text.secondary', lineHeight: '150' })}>
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
        </div>
      </div>
      <Footer
        onClick={() => {
          mutate();
        }}
      />
    </div>
  );
};
