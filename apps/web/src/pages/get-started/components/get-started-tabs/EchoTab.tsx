import { useSegment } from '@novu/shared-web';
import { css, cx } from '../../../../styled-system/css';
import { styled } from '../../../../styled-system/jsx';
import { OnboardingUseCasesTabsEnum } from '../../consts/OnboardingUseCasesTabsEnum';
import { AdditionInformationLink } from '../AdditionInformationLink';
import { CodeSnippet } from '../CodeSnippet';
import { text, title } from '../../../../styled-system/recipes';
import { IconCloudQueue, IconCode, IconHealthAndSafety, IconSettingsInputAntenna } from '@novu/design-system';

const link = 'https://docs.novu.co/echo/quickstart';

const COMMAND = 'npx novu-labs@latest echo';

const Text = styled('p', text);

const Title = styled('h2', title);
const SubTitle = styled('h3', title);

const columnText = css({ fontSize: 14, marginTop: 8, lineHeight: '20px', maxW: '214px' });

const columnIcon = css({ marginBottom: 8 });

const mainText = css({ maxW: '645px', fontSize: 14, lineHeight: '20px' });

export const EchoTab = () => {
  const segment = useSegment();

  const handleDocsLinkClick = () => {
    segment.track(`Additional Info Link - [Get Started]`, { href: link, tab: OnboardingUseCasesTabsEnum.ECHO });
  };

  return (
    <>
      <Title variant="section" className={css({ marginTop: 16 })}>
        Notification workflows as code
      </Title>
      <Text variant="secondary" className={cx(css({ marginTop: 8 }), mainText)}>
        Novu Echo SDK allows you to write notification workflows in your codebase locally right in your IDE as well as
        preview and edit the channel specific content in real-time.
      </Text>
      <Text variant="secondary" className={cx(css({ marginTop: 20, marginBottom: 24 }), mainText)}>
        You can use Echo with React Email, MJML, or any other template generator.
      </Text>
      <SubTitle variant="subsection">Try it out now</SubTitle>
      <Text variant="secondary" className={mainText}>
        Open your terminal and launch the Echo Studio
      </Text>
      <CodeSnippet
        command={COMMAND}
        className={cx(
          css({
            maxW: '400px',
            marginTop: 8,
            marginBottom: 40,
          }),
          css({
            '& input': {
              color: 'white !important',
            },
          })
        )}
        onClick={() => {
          segment.track(`Copy echo command - [Get Started]`);
        }}
      />
      <div className={css({ marginBottom: '50px' })}>
        <AdditionInformationLink channel={OnboardingUseCasesTabsEnum.ECHO} href={link} onClick={handleDocsLinkClick} />
      </div>
      <div className={css({ display: 'flex', gap: '24px' })}>
        <div>
          <IconCode size={32} className={columnIcon} />
          <SubTitle variant="subsection">Bring your own code</SubTitle>
          <Text variant="secondary" className={columnText}>
            Write the workflows as functions in your codebase, version, and manage via Git.
          </Text>
        </div>
        <div>
          <IconSettingsInputAntenna size={32} className={columnIcon} />
          <SubTitle variant="subsection">Limitless integrations</SubTitle>
          <Text variant="secondary" className={columnText}>
            Use React.email, MJML, or fetch templates from Braze, Hubspot, Sendgrid, more…
          </Text>
        </div>
        <div>
          <IconHealthAndSafety size={32} className={columnIcon} />
          <SubTitle variant="subsection">Type safety</SubTitle>
          <Text variant="secondary" className={columnText}>
            Bring your own JSON schemas for full, end-to-end validation and type safety.
          </Text>
        </div>
        <div>
          <IconCloudQueue size={32} className={columnIcon} />
          <SubTitle variant="subsection">Cloud synchronization</SubTitle>
          <Text variant="secondary" className={columnText}>
            Sync your own workflows with Novu Cloud and ease collaboration.
          </Text>
        </div>
      </div>
    </>
  );
};
