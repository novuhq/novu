/* eslint-disable max-len */
import { Prism } from '@mantine/prism';
import { Tabs } from '@novu/design-system';
import { IconCode, IconVisibility } from '@novu/novui/icons';
import { css } from '@novu/novui/css';
import { useEffect, useMemo, useState } from 'react';
import { createSearchParams, useNavigate } from 'react-router-dom';
import { PreviewWeb } from '../../components/workflow/preview/email/PreviewWeb';
import { useActiveIntegrations, useAuth } from '../../hooks/index';
import { useTemplates } from '../../hooks/useTemplates';
import { Footer } from './components/Footer';
import { Header } from './components/Header';
import { testTrigger } from '../../api/notification-templates';
import { useMutation } from '@tanstack/react-query';
import { IStepVariant } from '@novu/shared';
import { api } from '../../api/index';
import { ROUTES } from '../../constants/routes';
import { Flex, VStack } from '@novu/novui/jsx';
import { useSegment } from '../../components/providers/SegmentProvider';

export const StudioOnboardingPreview = () => {
  const { currentUser } = useAuth();
  const [tab, setTab] = useState<string>('Preview');
  const [content, setContent] = useState<string>('');
  const [subject, setSubject] = useState<string>('');
  const segment = useSegment();
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

  useEffect(() => {
    segment.track('Create workflow step started - [Onboarding - Signup]');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onTrigger = async () => {
    const to = {
      subscriberId: currentUser?._id,
      email: currentUser?.email,
    };

    const response = await triggerTestEvent({
      name: identifier,
      to,
      payload: {
        __source: 'onboarding-test-workflow',
      },
    });

    navigate({
      pathname: ROUTES.STUDIO_ONBOARDING_SUCCESS,
      search: createSearchParams({
        transactionId: response.transactionId,
      }).toString(),
    });
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
      <Header activeStepIndex={2} />
      <Flex
        justifyContent="center"
        className={css({
          backgroundImage: {
            _dark: '[radial-gradient(#292933 1.5px, transparent 0)]',
            base: '[radial-gradient(#fff 1.5px, transparent 0)]',
          },
          backgroundSize: '[16px 16px]',
          height: '100%',
        })}
      >
        <VStack
          alignContent="center"
          className={css({
            height: '100%',
          })}
        >
          <div
            className={css({
              width: 'onboarding',
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
                    <Prism withLineNumbers language="javascript">
                      {`
{
    subject: "Welcome to Novu! Ready to code?",
    body: \`<html xmlns="http://www.w3.org/1999/xhtml">
          <head>
            <title>Notification workflows rooted in how YOU work</title>
            <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 14px; line-height: 20px;">
            <div style="text-align: center; margin-bottom: 24px; background-color:#fff;">
              <img width="200px" src="https://web.novu.co/static/images/logo.png" />
            </div>
            <h1 style="margin: 0; margin-bottom: 16px;">Notification workflows rooted in how YOU work</h1>
            <p style="margin: 0; margin-bottom: 8px;">Hi!</p>
            <p style="margin: 0; margin-bottom: 8px;">Good to have you here! We continuously work on giving you the flexibility to
              build any notification setup you need - through code, right from your IDE - and to give your managers an easy way to adjust the notification content. Check
              out our <a href="https://docs.novu.co/echo/quickstart">docs</a> to learn more.</p>
            <p style="margin: 0; margin-bottom: 8px;">Questions or problems? Our <a href="https://discord.com/channels/895029566685462578/1019663407915483176">Discord support channel</a> is here for you.</p>
            <p style="margin: 0; margin-bottom: 8px;">Feedback? Head over to our <a href="https://roadmap.novu.co/roadmap">public roadmap</a> to submit it, or simply poke us on Discord or via email. We’re here to make your life easier!</p>
            <p style="margin: 0;">Cheers,<br />Novu Team</p>
          </body>
        </html>\`,
}`}
                    </Prism>
                  ),
                },
              ]}
            />
          </div>
        </VStack>
      </Flex>
      <Footer
        buttonText="Test workflow"
        onClick={() => {
          onTrigger();
        }}
        loading={isLoading}
        tooltip={`We'll send you a notification to ${currentUser?.email}`}
      />
    </div>
  );
};
