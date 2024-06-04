import { Prism } from '@mantine/prism';
import {
  Button,
  IconCode,
  IconPlayCircleOutline,
  IconVisibility,
  Input,
  Modal,
  Tabs,
  Title,
} from '@novu/design-system';
import { css } from '@novu/novui/css';
import { hstack, vstack } from '@novu/novui/patterns';
import { IStepVariant } from '@novu/shared';
import { useMemo, useState } from 'react';
import { PreviewWeb } from '../../components/workflow/preview/email/PreviewWeb';
import { useActiveIntegrations } from '../../hooks/index';
import { useTemplates } from '../../hooks/useTemplates';
import { Background } from './components/Background';
import { Footer } from './components/Footer';
import { Header } from './components/Header';

export const EchoOnboardingTest = () => {
  const [opened, setOpened] = useState(false);
  const [tab, setTab] = useState('Preview');
  const [content, setContent] = useState('');
  const [subject, setSubject] = useState('');
  const { integrations = [] } = useActiveIntegrations();
  const integration = useMemo(() => {
    return integrations.find((item) => item.channel === 'email' && item.primary) || null;
  }, [integrations]);
  const { templates, loading } = useTemplates({ pageSize: 1, areSearchParamsEnabled: false });
  const template = useMemo(() => {
    if (!templates) {
      return null;
    }

    return templates[0];
  }, [templates]);

  const identifier = useMemo(() => {
    if (template === null) {
      return null;
    }

    return template.triggers[0].identifier;
  }, [template]);

  const stepId = useMemo(() => {
    if (template === null) {
      return null;
    }

    return (template.steps[0] as IStepVariant).uuid;
  }, [template]);

  if (loading) {
    return null;
  }

  return (
    <div
      className={css({
        width: '100dvw',
        height: '100dvh',
      })}
    >
      <Header active={1} />
      <Background />
      <div
        className={vstack({
          alignContent: 'center',
          height: '100%',
        })}
      >
        <div
          className={css({
            width: '680px',
            zIndex: 1,
            paddingTop: '100',
          })}
        >
          <Tabs
            withIcon={true}
            value={tab}
            onTabChange={(value) => {
              setTab(value as string);
            }}
            menuTabs={[
              {
                icon: <IconVisibility />,
                value: 'Preview',
                content: (
                  <PreviewWeb
                    integration={integration}
                    content={content}
                    subject={subject}
                    onLocaleChange={() => {}}
                    locales={[]}
                  />
                ),
              },
              {
                icon: <IconCode />,
                value: 'Code',
                content: <Prism language="javascript">test</Prism>,
              },
            ]}
          />
        </div>
      </div>
      <Footer
        buttonText="Test workflow"
        onClick={() => {
          setOpened(true);
        }}
      />
      <Modal
        opened={opened}
        title={<Title size={2}>Test workflow</Title>}
        onClose={() => {
          setOpened(false);
        }}
      >
        <div
          className={hstack({
            alignItems: 'end',
          })}
        >
          <Input
            classNames={{
              input: css({
                marginBottom: '0 !important',
              }),
            }}
            className={css({
              width: '100%',
            })}
            label="Email address"
          />
          <Button
            className={css({
              height: '300 !important',
            })}
          >
            <IconPlayCircleOutline
              className={css({
                color: 'typography.text.main !important',
              })}
            />
            <span>Run a test</span>
          </Button>
        </div>
      </Modal>
    </div>
  );
};
