/* eslint-disable max-len */
import { Prism } from '@mantine/prism';
import { errorMessage, Tabs } from '@novu/design-system';
import { IconCode, IconVisibility } from '@novu/novui/icons';
import { css } from '@novu/novui/css';
import { useEffect, useMemo, useState } from 'react';
import { createSearchParams, useNavigate } from 'react-router-dom';
import { useWorkflowTrigger } from '../../studio/hooks/useBridgeAPI';
import { Footer } from './components/Footer';
import { Header } from './components/Header';
import { ROUTES } from '../../constants/routes';
import { VStack } from '@novu/novui/jsx';
import { Wrapper } from './components/Wrapper';
// TODO: This indicates that all onboarding pages for studio should move under the "Studio" folder
import { useDiscover, useWorkflowPreview } from '../../studio/hooks/useBridgeAPI';
import { useStudioState } from '../../studio/StudioStateProvider';
import { Text, Title } from '@novu/novui';
import { WorkflowsPanelLayout } from '../../studio/components/workflows/layout';
import { WorkflowStepEditorContentPanel } from '../../studio/components/workflows/step-editor/WorkflowStepEditorContentPanel';
import { WorkflowStepEditorControlsPanel } from '../../studio/components/workflows/step-editor/WorkflowStepEditorControlsPanel';
import { PageContainer } from '../../studio/layout';
import { useTelemetry } from '../../hooks/useNovuAPI';

export const StudioOnboardingPreview = () => {
  const [controls, setStepControls] = useState({});
  const [payload, setPayload] = useState({});
  const { testUser } = useStudioState();
  const [tab, setTab] = useState<string>('Preview');
  const track = useTelemetry();
  const navigate = useNavigate();
  const { data: bridgeResponse, isLoading: isLoadingList } = useDiscover();
  const { trigger, isLoading } = useWorkflowTrigger();

  const workflow = useMemo(() => {
    if (!bridgeResponse?.workflows?.length) {
      return null;
    }

    return bridgeResponse.workflows[0];
  }, [bridgeResponse]);

  const step = useMemo(() => {
    if (!workflow) {
      return null;
    }

    return workflow?.steps?.[0];
  }, [workflow]);

  const { data: preview, isLoading: previewLoading } = useWorkflowPreview(
    {
      workflowId: workflow?.workflowId,
      stepId: step?.stepId,
      payload: payload,
      controls: controls,
    },
    {
      enabled: !!(workflow?.workflowId && step?.stepId),
      refetchOnWindowFocus: 'always',
      refetchInterval: 1000,
    }
  );

  useEffect(() => {
    track('Create workflow step started - [Onboarding - Signup]');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onControlsChange(type: string, form: any) {
    switch (type) {
      case 'step':
        setStepControls(form.formData);
        break;
      case 'payload':
        setPayload(form.formData);
        break;
    }
  }

  const onTrigger = async () => {
    try {
      const to = {
        subscriberId: testUser.id,
        email: testUser.emailAddress,
      };

      const response = await trigger({
        workflowId: workflow?.workflowId,
        to,
        payload: { ...payload, __source: 'studio-onboarding-test-workflow' },
        controls: {
          steps: {
            [step?.stepId]: controls,
          },
        },
      });

      navigate({
        pathname: ROUTES.STUDIO_ONBOARDING_SUCCESS,
        search: createSearchParams({
          transactionId: response.data.transactionId,
        }).toString(),
      });
    } catch (err) {
      if (err instanceof Error) {
        errorMessage(err.message);
      }
      throw err;
    }
  };

  return (
    <Wrapper className={css({ overflow: 'auto' })}>
      <div
        className={css({
          backgroundSize: '[16px 16px]',
          minHeight: 'calc(100dvh - 4rem)',
          bg: 'surface.page',
        })}
      >
        <Header activeStepIndex={2} />
        <VStack
          alignContent="center"
          className={css({
            height: 'full',
          })}
        >
          <PageContainer
            className={css({
              width: 'full',
              // TODO: create and use token
              maxWidth: '1300px',
            })}
          >
            <Title variant="page">Preview your workflow</Title>

            <Text
              variant="main"
              color="typography.text.secondary"
              className={css({
                marginBottom: '150',
                marginTop: '50',
              })}
            >
              This is a preview of your sample workflow located in the <code>app/novu/workflows</code> directory. You
              can edit this file in your IDE and see the email changes reflected here.
            </Text>

            <WorkflowsPanelLayout>
              <WorkflowStepEditorContentPanel
                error={null}
                step={step}
                preview={preview}
                isLoadingPreview={previewLoading || isLoadingList}
              />
              <WorkflowStepEditorControlsPanel
                step={step}
                workflow={workflow}
                defaultControls={{}}
                onChange={onControlsChange}
              />
            </WorkflowsPanelLayout>
          </PageContainer>
        </VStack>
      </div>
      <Footer
        buttonText="Test workflow"
        onClick={() => {
          onTrigger();
        }}
        loading={isLoading}
        disabled={isLoading || isLoadingList || !workflow}
        tooltip={`Trigger a test of this workflow, delivered to: ${testUser.emailAddress} address`}
      />
    </Wrapper>
  );
};
