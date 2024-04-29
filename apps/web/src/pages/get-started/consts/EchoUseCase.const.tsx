import { StepDescription, StepText } from './shared';
import { OnboardingUseCase } from './types';
import { OnboardingUseCasesTabsEnum } from './OnboardingUseCasesTabsEnum';
import { useSegment } from '@novu/shared-web';
import { CodeSnippet } from '../components/CodeSnippet';
import { css } from '../../../styled-system/css';

const COMMAND = 'npx novu-labs@latest echo';

const EchoCodeSnippet = () => {
  const segment = useSegment();

  return (
    <CodeSnippet
      command={COMMAND}
      // value from designs
      className={css({ maxW: '400px' })}
      onClick={() => {
        segment.track(`Copy echo command - [Get Started]`);
      }}
    />
  );
};

export const EchoUseCaseConst: OnboardingUseCase = {
  title: 'Echo notifications center',
  type: OnboardingUseCasesTabsEnum.ECHO,
  description:
    'Novu Echo SDK allows you to write notification workflows in your codebase' +
    ' locally right in your IDE as well as preview and edit the channel specific content in real-time.' +
    ' You can use Echo with React Email, MJML, or any other template generator.',
  useCaseLink: 'https://docs.novu.co/echo/quickstart',
  steps: [
    {
      title: 'Configure endpoint',
      Description: function () {
        return (
          <StepDescription>
            <StepText>To get started, open your terminal and launch the Dev Studio.</StepText>
            <EchoCodeSnippet />
          </StepDescription>
        );
      },
    },
    {
      title: 'Create a workflow',
      Description: function () {
        return (
          <StepDescription>
            <StepText>
              Create type-safe, validated, and version-controlled Workflows
              <br /> with code, at the heart of event-driven system notifications.
            </StepText>
          </StepDescription>
        );
      },
    },
    {
      title: 'Create a step',
      Description: function () {
        return (
          <StepDescription>
            <StepText>
              Steps send notifications to subscribers. Each step can have
              <br /> customized content, aligning it with the provider's specifications.
            </StepText>
          </StepDescription>
        );
      },
    },
    {
      title: 'Sync with Novu cloud',
      Description: function () {
        return (
          <StepDescription>
            <StepText>
              Echo is for building and debugging, when Novu Cloud handling all
              <br /> logic and provider connections.
            </StepText>
          </StepDescription>
        );
      },
    },
    {
      title: 'You’re ready to send notifications',
      Description: function () {
        return null;
      },
    },
  ],
};
