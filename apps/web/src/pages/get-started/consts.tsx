import styled from '@emotion/styled';

import { ProductUseCasesEnum } from '@novu/shared';
import { colors } from '@novu/design-system';

export const onboardingUseCases: OnboardingUseCases = {
  [ProductUseCasesEnum.IN_APP]: {
    title: 'In-app notifications center',
    description:
      'Utilise Novu’s pre-built customisable in-app component. ' +
      'Or opt for the headless library to create your own in-app notification center.',
    steps: [
      {
        title: 'Configure In-App provider',
        Description: function () {
          return (
            <span>
              <a href={'https://novu.co'} style={{ color: '#DD2476' }} target="_blank" rel="noreferrer">
                Create In-app provider
              </a>
              <StepDescription>
                {' instance, and select a framework to set up credentials in the Novu’s Integration store.'}
              </StepDescription>
            </span>
          );
        },
      },
      {
        title: 'Build a workflow',
        Description: function () {
          return (
            <span>
              <StepDescription>Novu pre-built a workflow for testing.</StepDescription>
              <a
                href={'https://mantine.dev/core/timeline/'}
                style={{ color: '#DD2476' }}
                target="_blank"
                rel="noreferrer"
              >
                {' Customize '}
              </a>
              <StepDescription>it or create a new one on the Workflows page. </StepDescription>
            </span>
          );
        },
      },
      {
        title: 'Connect trigger and run test',
        Description: function () {
          return (
            <span>
              <a href={'https://novu.co'} style={{ color: '#DD2476' }} target="_blank" rel="noreferrer">
                Test the trigger
              </a>
              <StepDescription>
                {' as if you sent it from your API. Add a subscriber by sending data to the trigger method.'}
              </StepDescription>
            </span>
          );
        },
      },
      {
        title: 'Track activity feed',
        Description: function () {
          return (
            <span>
              <StepDescription>Discover</StepDescription>
              <a
                href={'https://mantine.dev/core/timeline/'}
                style={{ color: '#DD2476' }}
                target="_blank"
                rel="noreferrer"
              >
                {' activity feed '}
              </a>
              <StepDescription>
                to monitor notifications activity and see potential issues with a specific provider or channel.
              </StepDescription>
            </span>
          );
        },
      },
    ],
    Demo: () => {
      return <h1>GIF</h1>;
    },
  },
  [ProductUseCasesEnum.MULTI_CHANNEL]: {
    title: 'Multi-channel notifications',
    description:
      'Notifies subscribers using a wide range of channels: In-App, Email, Chat, Push, and SMS.\n' +
      '\n' +
      'Configure as many providers as you like to customise notification experience.',
    steps: [
      {
        title: 'Configure providers',
        Description: function () {
          return (
            <span>
              <StepDescription>
                Novu has set up trial email and SMS providers for you. To expand your options, add more providers in the
              </StepDescription>
              <a
                href={'https://mantine.dev/core/timeline/'}
                style={{ color: '#DD2476' }}
                target="_blank"
                rel="noreferrer"
              >
                {' Integration store'}
              </a>
              <StepDescription>.</StepDescription>
            </span>
          );
        },
      },
      {
        title: 'Build a workflow',
        Description: function () {
          return (
            <span>
              <StepDescription>Novu has prepared workflow templates.</StepDescription>
              <a
                href={'https://mantine.dev/core/timeline/'}
                style={{ color: '#DD2476' }}
                target="_blank"
                rel="noreferrer"
              >
                {'  Customize  '}
              </a>
              <StepDescription> a Multi-Channel template or start with a blank workflow.</StepDescription>
            </span>
          );
        },
      },
      {
        title: 'Connect trigger and run test',
        Description: function () {
          return (
            <span>
              <a
                href={'https://mantine.dev/core/timeline/'}
                style={{ color: '#DD2476' }}
                target="_blank"
                rel="noreferrer"
              >
                {'Test the trigger '}
              </a>
              <StepDescription>
                Test the trigger as if you sent it from your API. Add a subscriber by sending data to the trigger
                method.
              </StepDescription>
            </span>
          );
        },
      },
      {
        title: 'Track activity feed',
        Description: function () {
          return (
            <span>
              <StepDescription>Discover</StepDescription>
              <a
                href={'https://mantine.dev/core/timeline/'}
                style={{ color: '#DD2476' }}
                target="_blank"
                rel="noreferrer"
              >
                {' activity feed '}
              </a>
              <StepDescription>
                to monitor notifications activity and see potential issues with a specific provider or channel.
              </StepDescription>
            </span>
          );
        },
      },
    ],
    Demo: () => {
      return <h1>GIF</h1>;
    },
  },
  [ProductUseCasesEnum.DELAY]: {
    title: 'Delay step execution',
    description:
      'Introduces a specified time delay between workflow steps, ensuring a well-paced progression of events.',
    steps: [
      {
        title: 'Configure providers',
        Description: function () {
          return (
            <span>
              <StepDescription>
                Novu has set up trial email and SMS providers for you. To expand your options, add more providers in the
              </StepDescription>
              <a
                href={'https://mantine.dev/core/timeline/'}
                style={{ color: '#DD2476' }}
                target="_blank"
                rel="noreferrer"
              >
                {' Integration store'}
              </a>
              <StepDescription>.</StepDescription>
            </span>
          );
        },
      },
      {
        title: 'Build a workflow',
        Description: function () {
          return (
            <span>
              <StepDescription>Novu pre-built workflow with a digest node. page.</StepDescription>
              <a
                href={'https://mantine.dev/core/timeline/'}
                style={{ color: '#DD2476' }}
                target="_blank"
                rel="noreferrer"
              >
                {' Customize '}
              </a>
              <StepDescription>the workflow or create a new one on the Workflows page.</StepDescription>
            </span>
          );
        },
      },
      {
        title: 'Set-up a delay preferences',
        Description: function () {
          return (
            <span>
              <StepDescription>Novu has predefined a time interval of 5 minutes.</StepDescription>
              <a
                href={'https://mantine.dev/core/timeline/'}
                style={{ color: '#DD2476' }}
                target="_blank"
                rel="noreferrer"
              >
                {' Customise delay'}
              </a>
              <StepDescription>.</StepDescription>
            </span>
          );
        },
      },
      {
        title: 'Connect trigger and run test',
        Description: function () {
          return (
            <span>
              <a
                href={'https://mantine.dev/core/timeline/'}
                style={{ color: '#DD2476' }}
                target="_blank"
                rel="noreferrer"
              >
                {'Test the trigger '}
              </a>
              <StepDescription>
                as if you sent it from your API. Add a subscriber by sending data to the trigger method.
              </StepDescription>
            </span>
          );
        },
      },
      {
        title: 'Track activity feed',
        Description: function () {
          return (
            <span>
              <StepDescription>Discover</StepDescription>
              <a
                href={'https://mantine.dev/core/timeline/'}
                style={{ color: '#DD2476' }}
                target="_blank"
                rel="noreferrer"
              >
                {' activity feed '}
              </a>
              <StepDescription>
                to monitor notifications activity and see potential issues with a specific provider or channel.
              </StepDescription>
            </span>
          );
        },
      },
    ],
    Demo: () => {
      return <h1>GIF</h1>;
    },
  },
  [ProductUseCasesEnum.TRANSLATION]: {
    title: 'Translate content',
    description:
      'Upload translations to use them as variables or for auto-upload in the editor in a workflow.' +
      'This feature is available for business and enterprise plan.',
    steps: [
      {
        title: 'Configure providers',
        Description: function () {
          return (
            <span>
              <StepDescription>
                Novu has set up trial email and SMS providers for you. To expand your options, add more providers in the
              </StepDescription>
              <a
                href={'https://mantine.dev/core/timeline/'}
                style={{ color: '#DD2476' }}
                target="_blank"
                rel="noreferrer"
              >
                {' Integration store '}
              </a>
              <StepDescription>.</StepDescription>
            </span>
          );
        },
      },
      {
        title: 'Add a translation group',
        Description: function () {
          return (
            <span>
              <StepDescription>Add a translation group and specify the languages in the</StepDescription>
              <a
                href={'https://mantine.dev/core/timeline/'}
                style={{ color: '#DD2476' }}
                target="_blank"
                rel="noreferrer"
              >
                {' Translations page'}
              </a>
              <StepDescription>.</StepDescription>
            </span>
          );
        },
      },
      {
        title: 'Upload JSON files with languages',
        Description: function () {
          return (
            <span>
              <StepDescription>Upload JSON files with multiple languages to the translations group.</StepDescription>
            </span>
          );
        },
      },
      {
        title: 'Update content with translation variables',
        Description: function () {
          return (
            <span>
              <StepDescription>
                {
                  'Update content with {{i18n variables}} in your messages. These variables will automatically adapt to subscribers locale.'
                }
              </StepDescription>
            </span>
          );
        },
      },
    ],
    Demo: () => {
      return <h1>GIF</h1>;
    },
  },
  [ProductUseCasesEnum.DIGEST]: {
    title: 'Digest multiple events',
    description:
      'Aggregates multiple events into a single, concise message, preventing user overload with excessive notifications.',
    steps: [
      {
        title: 'Configure providers',
        Description: function () {
          return (
            <span>
              <StepDescription>
                Novu has set up trial email and SMS providers for you. To expand your options, add more providers in the
              </StepDescription>
              <a
                href={'https://mantine.dev/core/timeline/'}
                style={{ color: '#DD2476' }}
                target="_blank"
                rel="noreferrer"
              >
                {' Integration store'}
              </a>
              <StepDescription>.</StepDescription>
            </span>
          );
        },
      },

      {
        title: 'Build a workflow',
        Description: function () {
          return (
            <span>
              <StepDescription>Novu pre-built workflow with a digest node. page.</StepDescription>
              <a
                href={'https://mantine.dev/core/timeline/'}
                style={{ color: '#DD2476' }}
                target="_blank"
                rel="noreferrer"
              >
                {' Customize '}
              </a>
              <StepDescription>the workflow or create a new one on the Workflows page.</StepDescription>
            </span>
          );
        },
      },
      {
        title: 'Set-up a delay preferences',
        Description: function () {
          return (
            <span>
              <StepDescription>Novu pre-defined preferences for the digest node.</StepDescription>
              <a
                href={'https://mantine.dev/core/timeline/'}
                style={{ color: '#DD2476' }}
                target="_blank"
                rel="noreferrer"
              >
                {' Customise digest node'}
              </a>
              <StepDescription>.</StepDescription>
            </span>
          );
        },
      },
      {
        title: 'Connect trigger and run test',
        Description: function () {
          return (
            <span>
              <a
                href={'https://mantine.dev/core/timeline/'}
                style={{ color: '#DD2476' }}
                target="_blank"
                rel="noreferrer"
              >
                {'Test the trigger '}
              </a>
              <StepDescription>
                as if you sent it from your API. Add a subscriber by sending data to the trigger method. Click multiple
                times to see how the digest node butch messages.
              </StepDescription>
            </span>
          );
        },
      },
      {
        title: 'Track activity feed',
        Description: function () {
          return (
            <span>
              <StepDescription>Discover</StepDescription>
              <a
                href={'https://mantine.dev/core/timeline/'}
                style={{ color: '#DD2476' }}
                target="_blank"
                rel="noreferrer"
              >
                {' activity feed '}
              </a>
              <StepDescription>
                to monitor notifications activity and see potential issues with a specific provider or channel.
              </StepDescription>
            </span>
          );
        },
      },
    ],
    Demo: () => {
      return <h1>GIF</h1>;
    },
  },
};

const StepDescription = styled.div`
  display: inline;
  color: ${colors.B60};
`;

export type OnboardingUseCases = {
  [key in ProductUseCasesEnum]: OnboardingUseCase;
};

export interface IOnboardingStep {
  title: React.ReactNode;
  Description: React.ComponentType<any>;
}

export type OnboardingUseCase = {
  title: string;
  description: string;
  steps: IOnboardingStep[];
  Demo: React.ComponentType<any>;
};
