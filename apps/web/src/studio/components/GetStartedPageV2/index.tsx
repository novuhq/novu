import { Button, Text, Title } from '@novu/novui';
import { css } from '@novu/novui/css';
import { IconGroupAdd, IconOutlineMarkEmailUnread, IconOutlineNotificationsActive } from '@novu/novui/icons';
import { HStack, VStack } from '@novu/novui/jsx';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../../constants/routes';
import { useTelemetry } from '../../../hooks/useNovuAPI';
import { CodeSnippet } from '../../../pages/get-started/components/CodeSnippet';
import { PageContainer } from '../../layout/PageContainer';
import { Deploy } from './deploy';
import { Terminal } from './terminal';
import { Workflow } from './workflow';

export const GetStartedPageV2 = () => {
  const track = useTelemetry();
  const navigate = useNavigate();

  useEffect(() => {
    track('Get Started page visited - [Get started - V2]');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <PageContainer>
      <HStack
        className={css({
          justifyContent: 'center',
          width: '100%',
        })}
      >
        <div className={css({ width: '800px' })}>
          <Title
            className={css({
              marginBottom: '250',
            })}
            textAlign="center"
          >
            Start building your workflows in code
          </Title>
          <HStack
            className={css({
              marginBottom: '250',
              justifyContent: 'space-between',
              width: '100%',
              flexWrap: 'wrap',
            })}
          >
            <VStack gap="0" className={css({ width: '15rem' })}>
              <Terminal />
              <Title
                variant="subsection"
                className={css({
                  color: 'typography.text.secondary',
                })}
              >
                1. Launch local studio
              </Title>
            </VStack>
            <VStack gap="150" className={css({ width: '15rem' })}>
              <Workflow />
              <Title
                variant="subsection"
                className={css({
                  color: 'typography.text.secondary',
                })}
              >
                2. Create a workflow
              </Title>
            </VStack>
            <VStack gap="0" className={css({ width: '15rem' })}>
              <Deploy />
              <Title
                variant="subsection"
                className={css({
                  color: 'typography.text.secondary',
                })}
              >
                3. Deploy to production
              </Title>
            </VStack>
          </HStack>
          <HStack
            className={css({
              marginBottom: '5rem',
              flexWrap: 'wrap',
            })}
          >
            <VStack
              className={css({
                width: '100%',
                alignItems: 'flex-start',
              })}
              gap="50"
            >
              <Title variant="subsection">Run this in your terminal to get started</Title>
              <div
                style={{ width: '100%' }}
                onDoubleClick={() => {
                  track('Command copied - [Get Started - V2]');
                }}
              >
                <CodeSnippet
                  command="npx novu dev"
                  className={css({
                    width: '100%',
                    '& input': {
                      background: {
                        base: 'surface.panel !important',
                        _dark: 'surface.popover !important',
                      },
                    },
                  })}
                  onClick={() => {
                    track('Command copied - [Get Started - V2]');
                  }}
                />
              </div>
            </VStack>
          </HStack>
          <Title
            className={css({
              marginBottom: '150',
              color: 'typography.text.secondary',
              textAlign: 'center',
            })}
            variant="section"
          >
            Not an engineer? No problem. With Novu, you can...
          </Title>
          <HStack
            className={css({
              justifyContent: 'space-between',
              width: '100%',
              flexWrap: 'wrap',
            })}
            gap="250"
          >
            <VStack gap="50" className={css({ alignItems: 'flex-start', width: '15rem' })}>
              <HStack gap="50">
                <IconOutlineMarkEmailUnread />
                <Title
                  className={css({
                    textAlign: 'center',
                    color: 'typography.text.secondary',
                  })}
                  variant="subsection"
                >
                  Send custom emails
                </Title>
              </HStack>
              <Text variant="secondary" className={css({ width: '12rem', fontSize: '88' })}>
                Create customizable email notification workflows.
              </Text>
            </VStack>
            <VStack gap="50" className={css({ alignItems: 'flex-start', width: '15rem' })}>
              <HStack gap="50">
                <IconOutlineNotificationsActive />
                <Title
                  className={css({
                    textAlign: 'center',
                    color: 'typography.text.secondary',
                  })}
                  variant="subsection"
                >
                  Embed In-App center
                </Title>
              </HStack>
              <Text variant="secondary" className={css({ width: '12rem', fontSize: '88' })}>
                Embed our out-of-the-box notification center component.
              </Text>
            </VStack>
            <VStack gap="50" className={css({ alignItems: 'flex-start', width: '15rem' })}>
              <HStack gap="50">
                <IconGroupAdd />
                <Title
                  className={css({
                    textAlign: 'center',
                    color: 'typography.text.secondary',
                  })}
                  variant="subsection"
                >
                  Invite your team
                </Title>
              </HStack>
              <Button
                variant="outline"
                onClick={() => {
                  track('Invite button clicked - [Get Started - V2]');
                  navigate(ROUTES.TEAM_SETTINGS);
                }}
                Icon={IconGroupAdd}
              >
                Invite engineers
              </Button>
            </VStack>
          </HStack>
        </div>
      </HStack>
    </PageContainer>
  );
};
