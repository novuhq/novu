import { useSegment } from '@novu/shared-web';
import { css, cx } from '../../../../styled-system/css';
import { styled } from '../../../../styled-system/jsx';
import { OnboardingUseCasesTabsEnum } from '../../consts/OnboardingUseCasesTabsEnum';
import { AdditionInformationLink } from '../AdditionInformationLink';
import { CodeSnippet } from '../CodeSnippet';
import { text, title } from '../../../../styled-system/recipes';
import { IconCellTower, IconCloudQueue, IconCode, IconHealthAndSafety } from '@novu/design-system';

const link = 'https://docs.novu.co/echo/quickstart';

const COMMAND = 'npx novu-labs@latest echo';

const Text = styled('p', text);
const Title = styled('h2', title);
const SubTitle = styled('h3', title);

const columnText = css({ fontSize: '88', marginTop: '50', lineHeight: '125', maxW: '214px' });

const columnIcon = css({ marginBottom: '50' });

const mainText = css({ maxW: '645px', fontSize: '88', lineHeight: '125' });

export const EchoTab = () => {
  const segment = useSegment();

  const handleDocsLinkClick = () => {
    segment.track(`Additional Info Link - [Get Started]`, { href: link, tab: OnboardingUseCasesTabsEnum.ECHO });
  };

  return (
    <>
      <Title variant="section" className={css({ marginTop: '100' })}>
        Notification workflows as code
      </Title>
      <Text variant="secondary" className={cx(css({ marginTop: '50' }), mainText)}>
        Novu Echo SDK allows you to write notification workflows in your codebase locally right in your IDE as well as
        preview and edit the channel specific content in real-time.
      </Text>
      <Text variant="secondary" className={cx(css({ marginTop: '125', marginBottom: '150' }), mainText)}>
        You can use Echo with React Email, MJML, and other template engines.
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
            marginTop: '50',
            marginBottom: '250',
          }),
          css({
            '& input': {
              color: 'white !important',
            },
          })
        )}
        onClick={() => {
          segment.track(`Copy Echo command - [Get Started]`);
        }}
      />
      <div className={css({ marginBottom: '300' })}>
        <AdditionInformationLink channel={OnboardingUseCasesTabsEnum.ECHO} href={link} onClick={handleDocsLinkClick} />
      </div>
      <div className={css({ display: 'flex', gap: '150' })}>
        <div>
          <IconCode size={32} className={columnIcon} />
          <SubTitle variant="subsection">Bring your own code</SubTitle>
          <Text variant="secondary" className={columnText}>
            Write the workflows as functions in your codebase, version, and manage via Git.
          </Text>
        </div>
        <div>
          <IconCellTower size={32} className={columnIcon} />
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
