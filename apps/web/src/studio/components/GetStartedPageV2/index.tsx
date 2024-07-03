import { Text, Title } from '@novu/novui';
import { css, cx } from '@novu/novui/css';
import {
  IconEditNote,
  IconFolderOpen,
  IconGroupAdd,
  IconLaptopMac,
  IconOutlineMenuBook,
  IconOutlineRocketLaunch,
} from '@novu/novui/icons';
import { HStack, styled, VStack } from '@novu/novui/jsx';
import { text } from '@novu/novui/recipes';
import { ReactNode, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../../constants/routes';
import { useTelemetry } from '../../../hooks/useNovuAPI';
import { CodeSnippet } from '../../../pages/get-started/components/CodeSnippet';
import { PageContainer } from '../../layout/PageContainer';
import { Development } from './Development';
import { GithubAction } from './GithubAction';
import { Ide } from './ide';
import { Studio } from './Studio';

const Link = styled('a', text);

const BadgeButton = ({
  children,
  onClick,
  className,
}: {
  children: ReactNode;
  onClick: () => void;
  className?: string;
}) => {
  return (
    <Link
      className={cx(
        css({
          color: {
            _dark: 'legacy.B80 !important',
            base: 'legacy.B30 !important',
          },
          backgroundColor: {
            base: 'mauve.80.light !important',
            _dark: 'mauve.80.dark !important',
          },
          padding: '25',
          paddingLeft: '50',
          paddingRight: '50',
          fontSize: '75',
          borderRadius: 's',
        }),
        className
      )}
      onClick={() => {
        onClick();
      }}
    >
      <HStack gap="25">{children}</HStack>
    </Link>
  );
};

export const GetStartedPageV2 = () => {
  const track = useTelemetry();
  const navigate = useNavigate();

  useEffect(() => {
    track('Get Started page visited - [Get started - V2]');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <PageContainer>
      <VStack
        className={css({
          justifyContent: 'center',
          width: '100%',
        })}
      >
        <div className={css({ width: '960px' })}>
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
              marginBottom: '150',
              flexWrap: 'wrap',
            })}
          >
            <VStack
              className={css({
                width: '100%',
                alignItems: 'center',
              })}
              gap="50"
            >
              <div className={css({ width: '600px' })}>
                <HStack
                  className={css({
                    justifyContent: 'space-between',
                  })}
                >
                  <Title variant="subsection">Run this in your terminal to get started</Title>

                  <Link
                    className={css({
                      color: 'typography.text.secondary !important',
                    })}
                    onClick={() => {
                      track('Main docs link clicked - [Workflows empty state]');
                    }}
                    href="https://docs.novu.co/"
                  >
                    <HStack gap="25">
                      <IconOutlineMenuBook size={16} /> <span>Learn more</span>
                    </HStack>
                  </Link>
                </HStack>

                <div
                  style={{ width: '100%' }}
                  onDoubleClick={() => {
                    track('Command copied - [Get Started - V2]');
                  }}
                >
                  <CodeSnippet
                    command="npx novu@latest dev"
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
              </div>
            </VStack>
          </HStack>
          <HStack gap="50" className={css({ justifyContent: 'center' })}>
            <Text
              className={css({
                color: 'typography.text.secondary',
              })}
            >
              Not a developer? Invite your dev team to set you up
            </Text>
            <BadgeButton
              onClick={() => {
                track('Invite devs link clicked - [Workflows empty state]');
                navigate(ROUTES.TEAM_SETTINGS);
              }}
            >
              <IconGroupAdd size={16} /> <span>Invite devs</span>
            </BadgeButton>
          </HStack>
          <HStack
            className={css({
              marginTop: '375',
              justifyContent: 'space-between',
              width: '100%',
              flexWrap: 'wrap',
              alignItems: 'flex-start',
            })}
          >
            <VStack gap="0" className={css({ width: '17.5rem', alignItems: 'flex-start' })}>
              <HStack gap="50">
                <IconLaptopMac />
                <Title
                  variant="subsection"
                  className={css({
                    color: 'typography.text.secondary',
                    marginBottom: '25',
                  })}
                >
                  Build notifications in your IDE
                </Title>
              </HStack>
              <Text
                className={css({
                  color: 'typography.text.secondary',
                  marginBottom: '25',
                })}
              >
                Code real-life notification workflows and preview them locally
              </Text>
              <BadgeButton
                onClick={() => {
                  track('Examples link clicked - [Workflows empty state]');
                  window.open('http://docs.novu.co/how-to/introduction', '_blank');
                }}
                className={css({
                  marginBottom: '150',
                })}
              >
                <IconFolderOpen size={16} /> <span>Discover examples</span>
              </BadgeButton>
              <Ide />
            </VStack>
            <VStack gap="0" className={css({ width: '17.5rem', alignItems: 'flex-start' })}>
              <HStack gap="50">
                <IconEditNote />
                <Title
                  variant="subsection"
                  className={css({
                    color: 'typography.text.secondary',
                    marginBottom: '25',
                  })}
                >
                  Edit with your product team
                </Title>
              </HStack>
              <Text
                className={css({
                  color: 'typography.text.secondary',
                  marginBottom: '25',
                })}
              >
                Give your team control they need to modify notification content and behavior
              </Text>
              <BadgeButton
                onClick={() => {
                  track('Invite team link clicked - [Workflows empty state]');
                  navigate(ROUTES.TEAM_SETTINGS);
                }}
                className={css({
                  marginBottom: '150',
                })}
              >
                <IconGroupAdd size={16} /> <span>Invite team</span>
              </BadgeButton>
              <Development />
            </VStack>
            <VStack gap="0" className={css({ width: '17.5rem', alignItems: 'flex-start' })}>
              <HStack gap="50">
                <IconOutlineRocketLaunch />
                <Title
                  variant="subsection"
                  className={css({
                    color: 'typography.text.secondary',
                    marginBottom: '25',
                  })}
                >
                  Deploy quick and easy
                </Title>
              </HStack>
              <Text
                className={css({
                  color: 'typography.text.secondary',
                  marginBottom: '25',
                })}
              >
                Use the familiar CI/CD pipeline to get your notifications to production
              </Text>
              <BadgeButton
                onClick={() => {
                  track('Deployment docs link clicked - [Workflows empty state]');
                  window.open('https://docs.novu.co/deployment/production', '_blank');
                }}
                className={css({
                  marginBottom: '150',
                })}
              >
                <IconOutlineMenuBook size={16} /> <span>Learn more</span>
              </BadgeButton>
              <GithubAction />
            </VStack>
          </HStack>
        </div>
      </VStack>
    </PageContainer>
  );
};
