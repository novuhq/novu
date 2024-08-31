import { css, cx } from '@novu/novui/css';
import { Flex, styled } from '@novu/novui/jsx';
import { text, title } from '@novu/novui/recipes';
import { IconCellTower, IconCloudQueue, IconCode, IconHealthAndSafety } from '@novu/design-system';
import { useEffect } from 'react';
import { useMantineTheme } from '@mantine/core';
import { CodeSnippet } from '../CodeSnippet';
import { AdditionInformationLink } from '../AdditionInformationLink';
import { OnboardingUseCasesTabsEnum } from '../../consts/OnboardingUseCasesTabsEnum';
import { useSegment } from '../../../../../components/providers/SegmentProvider';
import { useFrameworkTerminalScript } from '../../../../../hooks/useFrameworkTerminalScript';

const link = 'https://docs.novu.co/framework/quickstart';

const COMMAND = 'npx novu@latest dev';

const Text = styled('p', text);
const Title = styled('h2', title);
const SubTitle = styled('h3', title);

const columnText = css({ textStyle: 'text.main', marginTop: '50', maxW: '214px' });
const columnIcon = css({ marginBottom: '50' });
const mainText = css({ textStyle: 'text.main', maxW: '645px' });

export const FrameworkTab = ({ className }: { className?: string }) => {
  const theme = useMantineTheme();
  const segment = useSegment();

  const handleDocsLinkClick = () => {
    segment.track(`Additional Info Link - [Get Started]`, { href: link, tab: OnboardingUseCasesTabsEnum.FRAMEWORK });
  };

  useFrameworkTerminalScript();

  useEffect(() => {
    const tabs = document.getElementsByClassName('nv-terminal-tab');
    for (let i = 0; i < tabs.length; i += 1) {
      const tab = tabs[i];
      tab.addEventListener('click', () => {
        segment.track(`Code snippet tab clicked - [Get Started]`, {
          language: tab.innerHTML,
        });
      });
    }
  });

  return (
    <Flex className={className} direction="row" alignItems="center" gap="300">
      <div>
        <Title variant="section" className={css({ marginTop: '100' })}>
          Create notification workflows as code
        </Title>
        <Text variant="secondary" className={cx(css({ marginTop: '50' }), mainText)}>
          With Novu, you write notification workflows in your codebase locally right in your IDE and preview and edit
          the channel-specific content in real-time.
        </Text>
        <Text variant="secondary" className={cx(css({ marginTop: '125', marginBottom: '150' }), mainText)}>
          Integrate React.Email, MJML, and other template engines easily.
        </Text>
        <SubTitle variant="subsection">Try it out now</SubTitle>
        <Text variant="secondary" className={mainText}>
          Open your terminal and launch the development studio
        </Text>
        <div
          onClick={() => {
            segment.track(`Copy Bridge command - [Get Started]`);
          }}
        >
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
                  color: theme.colorScheme === 'dark' ? 'white !important' : 'black !important',
                  background: theme.colorScheme === 'dark' ? '#161618 !important' : '#f4f4f4 !important',
                },
              })
            )}
            onClick={() => {}}
          />
        </div>

        <div className={css({ marginBottom: '300' })}>
          <AdditionInformationLink
            channel={OnboardingUseCasesTabsEnum.FRAMEWORK}
            href={link}
            onClick={handleDocsLinkClick}
          />
        </div>
        <Flex gap="150">
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
        </Flex>
        <Flex gap="150" className={css({ marginTop: '150' })}>
          <div>
            <IconHealthAndSafety size={32} className={columnIcon} />
            <SubTitle variant="subsection">Type safety</SubTitle>
            <Text variant="secondary" className={columnText}>
              Bring your own JSON schemas for full, end-to-end validation and type safety.
            </Text>
          </div>
          <div>
            <IconCloudQueue size={32} className={columnIcon} />
            <SubTitle variant="subsection">Sync and build visually</SubTitle>
            <Text variant="secondary" className={columnText}>
              Sync local workflows with Novu Cloud and ease collaboration using the web editor.
            </Text>
          </div>
        </Flex>
      </div>
      <div
        className={cx(
          css({
            '@media (max-width: 1500px)': {
              maxW: '500px',
            },
            '@media (max-width: 1250px)': {
              display: 'none',
            },
          })
        )}
      >
        <nv-framework-terminal></nv-framework-terminal>
      </div>
    </Flex>
  );
};
