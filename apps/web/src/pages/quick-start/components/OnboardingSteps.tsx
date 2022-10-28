import { Center, Grid, Timeline } from '@mantine/core';
import { Button, colors, Text } from '../../../design-system';
import { CheckCircle } from '../../../design-system/icons';
import { TriggerCard } from './TriggerCard';
import { Prism } from '@mantine/prism';
import React, { useEffect, useState } from 'react';
import useStyles, { ActiveWrapper, StyledDescription, StyledTitle } from './OnboardingSteps.styles';
import { useNavigate } from 'react-router-dom';
import { useTemplates } from '../../../api/hooks/use-templates';
import { useIntegrations } from '../../../api/hooks';
import { useQuery } from 'react-query';
import { getActivityStats } from '../../../api/activity';

export const OnboardingSteps = ({ onFinishedAll }: { onFinishedAll: () => void }) => {
  const navigate = useNavigate();

  const { templates = [] } = useTemplates();
  const { integrations = [] } = useIntegrations();
  const { data: activityStats } = useQuery<{
    yearlySent: number;
  }>('activityStats', getActivityStats);

  const [showTriggerExample, setShowTriggerExample] = useState(false);
  const [showGoLangTriggerExample, setShowGolangTriggerExample] = useState(false);

  const templateCreated = templates?.length > 0;
  const providerConfigured = integrations?.length > 0;
  const triggerSent = activityStats?.yearlySent ? activityStats?.yearlySent > 0 : false;

  const { classes, theme } = useStyles();

  useEffect(() => {
    if (templateCreated && providerConfigured && triggerSent) {
      onFinishedAll();
    }
  }, []);

  return (
    <Timeline
      lineWidth={1}
      color={theme.colorScheme === 'dark' ? colors.B30 : colors.B80}
      bulletSize={55}
      classNames={classes}
    >
      <Timeline.Item bullet={1} active={!providerConfigured}>
        <ActiveWrapper active={!providerConfigured} dark={theme.colorScheme === 'dark'}>
          <OnboardingStepHeader
            title="Connect your delivery providers"
            description="You can choose to connect any of our available delivery providers and manage them from a single place"
          />
          {!providerConfigured ? (
            <Button mt={20} onClick={() => navigate('/integrations')}>
              Configure Now
            </Button>
          ) : (
            <Center mt={20} inline>
              <CheckCircle color={colors.success} />
              <Text ml={7} color={colors.success}>
                Configured
              </Text>
            </Center>
          )}
        </ActiveWrapper>
      </Timeline.Item>
      <Timeline.Item bullet={2} active={!templateCreated}>
        <ActiveWrapper active={!templateCreated} dark={theme.colorScheme === 'dark'}>
          <OnboardingStepHeader
            title="Create your first notification template"
            description="To start sending notifications you need to create your a template with some channels"
          />
          {!templateCreated ? (
            <Button data-test-id="create-template-btn" mt={20} onClick={() => navigate('/templates/create')}>
              Create Now
            </Button>
          ) : (
            <Center mt={20} inline>
              <CheckCircle color={colors.success} />
              <Text data-test-id="template-created" ml={7} color={colors.success}>
                Created
              </Text>
            </Center>
          )}
        </ActiveWrapper>
      </Timeline.Item>
      <Timeline.Item bullet={3} active={!triggerSent}>
        <ActiveWrapper active={!triggerSent} dark={theme.colorScheme === 'dark'}>
          <OnboardingStepHeader
            title="Send a trigger from your API"
            description="Use one of our server side SDK’s to send triggers from your API"
          />
          <Grid mt={20}>
            <TriggerCard
              name={`node-${theme.colorScheme === 'dark' ? 'dark' : 'light'}`}
              title="Node.js"
              exist={true}
              onClick={() => {
                setShowGolangTriggerExample(false);
                setShowTriggerExample((prev) => !prev);
              }}
              opened={showTriggerExample}
            />
            <TriggerCard
              name={`golang-${theme.colorScheme === 'dark' ? 'dark' : 'light'}`}
              title="Golang"
              exist={true}
              onClick={() => {
                setShowTriggerExample(false);
                setShowGolangTriggerExample((prev) => !prev);
              }}
              opened={showGoLangTriggerExample}
            />
            <TriggerCard name="spring" title="Spring Boot" />
            <TriggerCard name="kotlin" title="Kotlin" />
          </Grid>
          {showTriggerExample && (
            <div>
              <StyledDescription mt={20}>Here is an example code usage</StyledDescription>
              <Prism mt={10} styles={prismStyles} language="javascript">
                {triggerCodeSnippet}
              </Prism>
            </div>
          )}
          {showGoLangTriggerExample && (
            <div>
              <StyledDescription mt={20}>Here is an example code usage</StyledDescription>
              <Prism mt={10} styles={prismStyles} language="go">
                {golangCodeSnippet}
              </Prism>
            </div>
          )}
        </ActiveWrapper>
      </Timeline.Item>
      <Timeline.Item bullet={4} active={true}>
        <OnboardingStepHeader
          title="Embed a notification center in your app (Optional)"
          description="Use our embeddable widget to add a notification center in minutes"
        />
        <a href="https://docs.novu.co/notification-center/iframe-embed" target="_blank">
          <Button mt={20}> Embed Now</Button>
        </a>
      </Timeline.Item>
    </Timeline>
  );
};

const OnboardingStepHeader = ({ title, description }: { title: string; description: string }) => {
  return (
    <div>
      <StyledTitle>{title}</StyledTitle>
      <StyledDescription>{description}</StyledDescription>
    </div>
  );
};

const prismStyles = (theme) => ({
  scrollArea: {
    border: ` 1px solid ${theme.colorScheme === 'dark' ? colors.B30 : colors.B80}`,
    borderRadius: '7px',
  },
  code: {
    fontWeight: 400,
    color: `${colors.B60} !important`,
    backgroundColor: 'transparent !important',
  },
});

const triggerCodeSnippet = `import { Novu } from '@novu/node'; 

const novu = new Novu('<API_KEY>');

novu.trigger('<REPLACE_WITH_TRIGGER_ID>', {
  to: { 
    subscriberId: '<REPLACE_WITH_USER_ID>', 
  },
  payload: {
     '<REPLACE_WITH_VARIABLE_NAME>': "<REPLACE_WITH_DATA>",
  }
});
`;

const golangCodeSnippet = `
package main

import (
  novu "github.com/novuhq/go-novu/lib"
)

apiKey := "<REPLACE_WITH_API_KEY>"
subscriberID := "<REPLACE_WITH_USER_ID>"
eventID := "<REPLACE_WITH_TRIGGER_ID>"

novuClient := novu.NewAPIClient(apiKey, &novu.Config{})

to := map[string]interface{}{
  "subscriberId": subscriberID,
}

payload := map[string]interface{}{
  "<REPLACE_WITH_VARIABLE_NAME>": "<REPLACE_WITH_DATA>"
}

_, err := novuClient.EventApi.Trigger(
    ctx, 
    eventID, 
    novu.ITriggerPayloadOptions{To: to, Payload: payload}
)
if err != nil {
  log.Fatal("novu error", err.Error())
}  
`;
