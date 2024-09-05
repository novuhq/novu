import { Code, Accordion } from '@mantine/core';
import { css } from '@novu/novui/css';
import { useState, useEffect } from 'react';
import Joyride, { ACTIONS, CallBackProps, LIFECYCLE, STATUS, Step, TooltipRenderProps } from 'react-joyride';
import { Button } from '@novu/novui';

export function TourGuideComponent({
  setClickedStepId,
  steps,
  isBridgeAppLoading,
  runJoyride,
  setRunJoyride,
  joyStepIndex,
  setJoyStepIndex,
}) {
  const joyrideSteps: Step[] = [
    {
      target: '[data-test-id="playground-header-title"]',
      title: 'Welcome to the Playground',
      content:
        'This is an interactive playground, where you will learn about the main Novu concepts, and send your first test notification.',
      placement: 'bottom',
      disableBeacon: true,
    },
    {
      target: '.code-editor',
      styles: {
        options: {
          width: '550px',
        },
      },
      title: 'Notifications as Code',
      content: (
        <div>
          <p className={css({ marginBottom: '15px !important' })}>
            This is a sandbox IDE with a pre-defined notification workflow. Notification workflows are written as code
            with the step function. Step types include:
          </p>
          <Accordion
            classNames={{
              item: css({
                marginBottom: '0 !important',
              }),
            }}
          >
            <Accordion.Item value="email">
              <Accordion.Control>SMS</Accordion.Control>
              <Accordion.Panel>
                An SMS Step can be added to your workflow by using the following snippet:
                <Code block style={{ marginTop: '10px', fontSize: '14px' }}>
                  {`await step.sms('sms-step', () => {
  return {
    body: 'Hello, world!',
  }
})`}
                </Code>
              </Accordion.Panel>
            </Accordion.Item>
            <Accordion.Item value="inbox">
              <Accordion.Control>Inbox</Accordion.Control>
              <Accordion.Panel>
                An Inbox Step can be added to your workflow by using the following snippet:
                <Code block style={{ marginTop: '10px', fontSize: '14px' }}>
                  {`await step.inApp('inApp-step', () => {
  return {
    body: 'Hello, world!',
  }
})`}
                </Code>
              </Accordion.Panel>
            </Accordion.Item>
            <Accordion.Item value="digest">
              <Accordion.Control>Digest</Accordion.Control>
              <Accordion.Panel>
                A Digest Step can be added to your workflow by using the following snippet:
                <Code block style={{ marginTop: '10px', fontSize: '14px' }}>
                  {`const { events } = await step.digest('digest-step', async () => {
    return {
        amount: 1,
        unit: 'hours'
    }
});`}
                </Code>
              </Accordion.Panel>
            </Accordion.Item>
            <Accordion.Item value="delay">
              <Accordion.Control>Delay</Accordion.Control>
              <Accordion.Panel>
                A Delay Step can be added to your workflow by using the following snippet:
                <Code block style={{ marginTop: '10px', fontSize: '14px' }}>
                  {`await step.delay('delay-step', () => {
  return {
    amount: 1,
    unit: 'hours'
  }
})`}
                </Code>
              </Accordion.Panel>
            </Accordion.Item>
          </Accordion>
        </div>
      ),
      placement: 'right',
      disableBeacon: true,
    },
    {
      title: 'Studio',
      target: '.workflow-flow',
      content:
        // eslint-disable-next-line max-len
        'Your notification workflows are presented visually in Studio. Here, you can preview your notification content and workflow logic with live updates as you develop your integration.',
      placement: 'left',
      disableBeacon: true,
    },
    {
      target: '.nv-tabs__root',
      title: 'Step controls',
      content:
        // eslint-disable-next-line max-len
        'Step controls enable you to modify the content and behaviour of your notification workflows without changing your code. These controls are generated from schemas defined in your notification workflow.',
      placement: 'left',
      disableBeacon: true,
    },
    {
      target: '[data-test-id="trigger-test-button"]',
      title: 'Trigger a test',
      content:
        // eslint-disable-next-line max-len
        'Trigger the workflow now and view your first test email arrive in your inbox. Each trigger generates an execution log to debug your notification workflow.',
      placement: 'bottom',
      disableBeacon: true,
    },
  ];

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status, lifecycle, action, index } = data;

    if (action === ACTIONS.NEXT && lifecycle === LIFECYCLE.COMPLETE) {
      setJoyStepIndex(index + 1);
    }

    if (action === ACTIONS.PREV && lifecycle === LIFECYCLE.COMPLETE) {
      setJoyStepIndex(index - 1);
    }

    if (
      action === ACTIONS.NEXT &&
      data.step.target === '.workflow-flow' &&
      steps?.length &&
      lifecycle === LIFECYCLE.COMPLETE
    ) {
      setRunJoyride(false);
      setJoyStepIndex(3);
      setClickedStepId(steps[0].stepId);

      setTimeout(() => {
        setRunJoyride(true);
      }, 300);
    }

    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      setRunJoyride(false);
    }
  };

  useEffect(() => {
    if (joyStepIndex !== undefined && joyStepIndex !== null) {
      setRunJoyride(true);
    }
  }, [joyStepIndex, setRunJoyride]);

  return (
    <Joyride
      stepIndex={joyStepIndex}
      steps={joyrideSteps}
      run={runJoyride}
      continuous
      showSkipButton
      showProgress={false}
      callback={handleJoyrideCallback}
      disableOverlayClose
      disableCloseOnEsc
      spotlightClicks
      hideCloseButton
      tooltipComponent={(props) => <CustomTooltip {...props} isBridgeAppLoading={isBridgeAppLoading} />}
      locale={{
        last: 'Finish Tour',
      }}
      styles={{
        tooltipContent: {
          textAlign: 'left',
        },
        options: {
          arrowColor: '#23232b',
          backgroundColor: '#23232b',
          primaryColor: '#dd2476',
          textColor: '#ffffff',
          zIndex: 1000,
        },
        buttonBack: {
          color: '#ffffff',
        },
      }}
    />
  );
}

function CustomTooltip({
  index,
  step,
  primaryProps,
  tooltipProps,
  isLastStep,
  isBridgeAppLoading,
  backProps,
  skipProps,
  size,
}: TooltipRenderProps & { isBridgeAppLoading: boolean }) {
  return (
    <div
      {...tooltipProps}
      className={css({
        backgroundColor: '#23232b',
        borderRadius: '8px',
        boxShadow: '0 1px 10px rgba(0, 0, 0, 0.15)',
        color: 'typography.text.secondary',
        padding: '15px',
        maxWidth: '450px',
        fontSize: '14px',
      })}
    >
      {step.title && (
        <h4 className={css({ margin: '0 0 10px', fontSize: '18px', color: 'white', position: 'relative' })}>
          {step.title}{' '}
          <span
            className={css({
              color: 'typography.text.secondary',
              fontSize: '12px',
              position: 'absolute',
              right: '10px',
              top: '3px',
            })}
          >
            ({index + 1}/{size})
          </span>
        </h4>
      )}
      <div className={css({ marginBottom: '15px' })}>{step.content}</div>
      <div className={css({ marginTop: '15px', display: 'flex', justifyContent: 'space-between' })}>
        <div>
          <Button
            size="sm"
            {...skipProps}
            className={css({
              backgroundColor: 'transparent',
              color: '#dd2476',
            })}
          >
            Skip
          </Button>
        </div>
        <div>
          {index > 0 && (
            <Button
              size="sm"
              {...backProps}
              className={css({
                backgroundColor: 'transparent',
                color: '#dd2476',
                marginRight: '10px',
              })}
            >
              Back
            </Button>
          )}
          {index === 2 ? (
            <Button
              onClick={primaryProps.onClick}
              disabled={isBridgeAppLoading}
              size="sm"
              className={css({
                backgroundColor: '#dd2476',
              })}
            >
              {isBridgeAppLoading ? (
                <div className={css({ display: 'flex', alignItems: 'center' })}>Waiting for server load...</div>
              ) : (
                `Next`
              )}
            </Button>
          ) : (
            <Button
              size="sm"
              {...primaryProps}
              className={css({
                backgroundColor: '#dd2476',
              })}
            >
              {isLastStep ? 'Finish' : `Next`}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
