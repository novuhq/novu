import { StepDescription } from './shared';
import { OnboardingUseCase } from './types';
import { OnboardingUseCasesTabsEnum } from './OnboardingUseCasesTabsEnum';
import { useSegment } from '@novu/shared-web';
import { CodeSnippet } from '../components/CodeSnippet';
import { css } from '../../../styled-system/css';
import { styled } from '../../../styled-system/jsx';
import { text } from '../../../styled-system/recipes';

const COMMAND = 'npx novu-labs@latest echo';

const maxWClassName = css({ maxW: '400px' });

const EchoCodeSnippet = () => {
  const segment = useSegment();

  return (
    <CodeSnippet
      command={COMMAND}
      className={maxWClassName}
      onClick={() => {
        segment.track(`Copy echo command - [Get Started]`);
      }}
    />
  );
};

const StepText = styled('p', text);

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
            <StepText variant="secondary" className={maxWClassName}>
              To get started, open your terminal and launch the Dev Studio.
            </StepText>
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
            <StepText variant="secondary" className={maxWClassName}>
              Create type-safe, validated, and version-controlled Workflows with code, at the heart of event-driven
              system notifications.
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
            <StepText variant="secondary" className={maxWClassName}>
              Steps send notifications to subscribers. Each step can have customized content, aligning it with the
              provider's specifications.
            </StepText>
          </StepDescription>
        );
      },
    },
    {
      title: 'Sync with Novu Cloud',
      Description: function () {
        return (
          <StepDescription>
            <StepText variant="secondary" className={maxWClassName}>
              Echo is for building and debugging, when Novu Cloud handling all logic and provider connections.
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
