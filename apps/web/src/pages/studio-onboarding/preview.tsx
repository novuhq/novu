/* eslint-disable max-len */
import { Prism } from '@mantine/prism';
import { Tabs } from '@novu/design-system';
import { IconCode, IconVisibility } from '@novu/novui/icons';
import { css } from '@novu/novui/css';
import { useEffect, useMemo, useState } from 'react';
import { createSearchParams, useNavigate } from 'react-router-dom';
import { PreviewWeb } from '../../components/workflow/preview/email/PreviewWeb';
import { useAuth } from '../../hooks/index';
import { Footer } from './components/Footer';
import { Header } from './components/Header';
import { testTrigger } from '../../api/notification-templates';
import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '../../api/index';
import { ROUTES } from '../../constants/routes';
import { Flex, VStack } from '@novu/novui/jsx';
import { useSegment } from '../../components/providers/SegmentProvider';
import { getTunnelUrl } from '../../api/bridge/utils';
import { bridgeApi } from '../../api/bridge/bridge.api';
import { Wrapper } from './components/Wrapper';

export const StudioOnboardingPreview = () => {
  const { currentUser } = useAuth();
  const [tab, setTab] = useState<string>('Preview');
  const [content, setContent] = useState<string>('');
  const [subject, setSubject] = useState<string>('');
  const segment = useSegment();
  const navigate = useNavigate();
  const { mutateAsync: triggerTestEvent, isLoading } = useMutation(testTrigger);
  const { data: bridgeResponse, isLoading: isLoadingList } = useQuery(['bridge-workflows'], async () => {
    return bridgeApi.discover();
  });

  const template = useMemo(() => {
    if (!bridgeResponse?.workflows?.length) {
      return null;
    }

    return bridgeResponse.workflows[0];
  }, [bridgeResponse]);

  const { data: preview, isLoading: previewLoading } = useQuery(
    ['workflow-preview', template?.workflowId, template?.steps[0]?.stepId],
    async () => {
      return bridgeApi.getStepPreview(template?.workflowId, template?.steps[0]?.stepId, {}, {});
    },
    {
      enabled: !!(template && template?.workflowId && template?.steps[0]?.stepId),
      refetchOnWindowFocus: 'always',
      refetchInterval: 1000,
    }
  );

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
      name: template?.workflowId,
      to,
      payload: {
        __source: 'onboarding-test-workflow',
      },
      bridgeUrl: getTunnelUrl(),
    });

    navigate({
      pathname: ROUTES.STUDIO_ONBOARDING_SUCCESS,
      search: createSearchParams({
        transactionId: response.transactionId,
      }).toString(),
    });
  };

  return (
    <Wrapper className={css({ overflow: 'auto' })}>
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
                      content={preview?.outputs?.body}
                      subject={preview?.outputs?.subject}
                      onLocaleChange={() => {}}
                      locales={[]}
                      bridge={true}
                      loading={previewLoading || isLoadingList}
                      classNames={{
                        contentContainer: css({
                          height: 'calc(60vh - 28px) !important',
                        }),
                      }}
                    />
                  ),
                },
                {
                  icon: <IconCode />,
                  value: 'Code',
                  content: (
                    <Prism withLineNumbers language="typescript">
                      {`workflow("welcome-onboarding-email", async ({ step, payload }) => {
    await step.email(
      "send-email",
      async (inputs) => {
        return {
          subject: "A Successful Test on Novu!",
          body: renderEmail(inputs, payload),
        };
      },
      {
        inputSchema: {
          type: "object",
          properties: {
            components: {
              title: "Add Custom Fields:",
              type: "array",
              default: [{
                "componentType": "heading",
                "componentText": "Welcome to Novu"
              }, {
                "componentType": "text",
                "componentText": "Congratulations on receiving your first notification email from Novu! Join the hundreds of thousands of developers worldwide who use Novu to build notification platforms for their products."
              }, {
                "componentType": "list",
                "componentListItems": [
                  {
                    title: "Send Multi-channel notifications",
                    body: "You can send notifications to your users via multiple channels (Email, SMS, Push, and In-App) in a heartbeat."
                  },
                  {
                    title: "Send Multi-channel notifications",
                    body: "You can send notifications to your users via multiple channels (Email, SMS, Push, and In-App) in a heartbeat."
                  }
                ]
              }, {
                "componentType": "text",
                "componentText": "Ready to get started? Click on the button below, and you will see first-hand how easily you can edit this email content."
              }, {
                "componentType": "button",
                "componentText": "Edit Email"
              }],
              items: {
                type: "object",
                properties: {
                  componentType: {
                    type: "string",
                    enum: [
                      "text", "divider", "button", "button-link", "image", "image-2", "image-3", "heading", "users", "list"
                    ],
                    default: "text",
                  },
                  componentText: {
                    type: "string",
                    default: "",
                  },
                  componentLink: {
                    type: "string",
                    default: "https://enterlink.com",
                    format: "uri",
                  },
                  align: {
                    type: "string",
                    enum: ["left", "center", "right"],
                    default: "center",
                  },
                  componentListItems: {
                    type: "array",
                    default: [],
                    items: {
                      type: "object",
                      properties: {
                        title: {
                          type: "string"
                        },
                        body: {
                          type: "string"
                        }
                      }
                    }
                  }
                },
              },
            },
            welcomeHeaderText: {
              type: "string",
              default: "Welcome to Novu {{helloWorld}}"
            },
            belowHeaderText: {
              title: "Text Under The Welcome Header",
              type: "string",
              default: "Congratulations on receiving your first notification email from Novu! Join the hundreds of thousands of developers worldwide who use Novu to build notification platforms for their products."
            },
          },
        },
      },
    );
  },
  { payloadSchema: {
      type: "object",
      properties: {
        teamImage: {
          title: "Team Image",
          type: "string",
          default:
            "https://images.spr.so/cdn-cgi/imagedelivery/j42No7y-dcokJuNgXeA0ig/dca73b36-cf39-4e28-9bc7-8a0d0cd8ac70/standalone-gradient2x_2/w=128,quality=90,fit=scale-down",
          format: "uri",
        },
        userImage: {
          title: "User Image",
          type: "string",
          default:
            "https://react-email-demo-48zvx380u-resend.vercel.app/static/vercel-user.png",
          format: "uri",
        },
        arrowImage: {
          title: "Arrow",
          type: "string",
          default:
            "https://react-email-demo-bdj5iju9r-resend.vercel.app/static/vercel-arrow.png",
          format: "uri",
        },
        editEmailLink: {
          title: "Email Link Button Text",
          type: "string",
          default: "https://web.novu.co",
          format: "uri",
        },
        helloWorld: {
          type: "string",
          default: "Hello World"
        },
      }
    }
  },
);
`}
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
        disabled={isLoading || isLoadingList || !template}
        tooltip={`We'll send you a notification to ${currentUser?.email}`}
      />
    </Wrapper>
  );
};
