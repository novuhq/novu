import { Prism } from '@mantine/prism';
import { Tabs } from '@novu/design-system';
import { IconCode, IconVisibility } from '@novu/novui/icons';
import { css } from '@novu/novui/css';
import { vstack } from '@novu/novui/patterns';
import { api, ROUTES, useAuth } from '@novu/shared-web';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PreviewWeb } from '../../components/workflow/preview/email/PreviewWeb';
import { useActiveIntegrations } from '../../hooks/index';
import { useTemplates } from '../../hooks/useTemplates';
import { Background } from './components/Background';
import { Footer } from './components/Footer';
import { Header } from './components/Header';
import { testTrigger } from '../../api/notification-templates';
import { useMutation } from '@tanstack/react-query';
import * as Sentry from '@sentry/react';
import { IStepVariant } from '@novu/shared';

export const StudioOnboardingPreview = () => {
  const { currentUser } = useAuth();
  const [tab, setTab] = useState('Preview');
  const [content, setContent] = useState('');
  const [subject, setSubject] = useState('');

  const navigate = useNavigate();
  const { integrations = [] } = useActiveIntegrations();
  const integration = useMemo(() => {
    return integrations.find((item) => item.channel === 'email' && item.primary) || null;
  }, [integrations]);
  const { mutateAsync: triggerTestEvent, isLoading } = useMutation(testTrigger);
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

  const { mutateAsync, isLoading: previewLoading } = useMutation(
    (data) => api.post('/v1/echo/preview/' + identifier + '/' + stepId, data),
    {
      onSuccess(data: any) {
        setContent(data.outputs.body);
        setSubject(data.outputs.subject);
      },
    }
  );

  useEffect(() => {
    if (!identifier || !stepId) {
      return;
    }

    mutateAsync();
  }, [identifier, mutateAsync, stepId]);

  const onTrigger = async () => {
    const to = {
      subscriberId: currentUser._id,
      email: currentUser.email,
    };

    try {
      await triggerTestEvent({
        name: identifier,
        to,
        payload: {
          __source: 'onboarding-test-workflow',
        },
      });

      navigate(ROUTES.STUDIO_ONBOARDING_SUCCESS);
    } catch (e: any) {
      Sentry.captureException(e);
    }
  };

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
            width: '880px',
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
                    loading={previewLoading}
                    className={css({
                      height: 'calc(50vh - 28px) !important',
                    })}
                  />
                ),
              },
              {
                icon: <IconCode />,
                value: 'Code',
                content: (
                  <Prism withLineNumbers={true} language="javascript">
                    {`
{
    subject: "New Job HVAC",
    body: \`<html xmlns="http://www.w3.org/1999/xhtml">
      <head>
        <title>New Job HVAC</title>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
      </head>
      <body>
        <h1>New Job HVAC</h1>
        <p>Hello Alan Turing,</p>
        <p>Alan <a href="mailto:alan.turing@example.com">alan.turing@example.com</a> has invited you to the HVAC</p>
        <p>A brilliant British mind, cracked Nazi codes in WWII and is considered the father of theoretical computer science
          and artificial intelligence.</p>
     </body>
    </html>\`,
}`}
                  </Prism>
                ),
              },
            ]}
          />
        </div>
      </div>
      <Footer
        buttonText="Test workflow"
        onClick={() => {
          onTrigger();
        }}
        loading={isLoading}
        tooltip={`We'll send you a notification to ${currentUser.email}`}
      />
    </div>
  );
};
