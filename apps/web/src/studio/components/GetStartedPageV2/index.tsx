import { Text, Title } from '@novu/novui';
import { css, cx } from '@novu/novui/css';
import {
  IconEditNote,
  IconFolderOpen,
  IconGroupAdd,
  IconLaptopMac,
  IconOutlineMenuBook,
  IconOutlineRocketLaunch,
  IconType,
} from '@novu/novui/icons';
import { HStack, styled, VStack } from '@novu/novui/jsx';
import { text as textRecipe } from '@novu/novui/recipes';
import { ReactNode, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../../constants/routes';
import { useTelemetry } from '../../../hooks/useNovuAPI';
import { CodeSnippet } from '../../../pages/get-started/components/CodeSnippet';
import { PageContainer } from '../../layout/PageContainer';
import { Development } from './Development';
import { GithubAction } from './GithubAction';
import { Ide } from './ide';

const Link = styled('a', textRecipe);

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
            _dark: 'legacy.BGLight !important',
            base: 'legacy.B20 !important',
          },
          backgroundColor: {
            base: 'legacy.BGLight !important',
            _dark: 'legacy.B20 !important',
          },
          padding: '25',
          paddingLeft: '50',
          paddingRight: '50',
          fontSize: '75',
          borderRadius: 's',
          cursor: 'pointer',
          lineHeight: 'sm',
          fontWeight: 600,
        }),
        className
      )}
      href="#"
      onClick={(e) => {
        e.preventDefault();
        onClick();
      }}
    >
      <HStack gap="25">{children}</HStack>
    </Link>
  );
};

const SkipCTA = ({
  text,
  buttonText,
  onClick,
  Icon,
}: {
  text: string;
  buttonText: string;
  onClick: () => void;
  Icon?: any;
}) => (
  <HStack gap="50" className={css({ justifyContent: 'center', marginTop: 'margins.layout.page.content-buttons' })}>
    <Text
      className={css({
        color: 'typography.text.secondary',
      })}
    >
      {text}
    </Text>

    <BadgeButton onClick={onClick}>
      {Icon && (
        <Icon
          size={'16'}
          className={css({
            color: {
              _dark: 'legacy.BGLight !important',
              base: 'legacy.B20 !important',
            },
          })}
        />
      )}{' '}
      <span>{buttonText}</span>
    </BadgeButton>
  </HStack>
);

export const GetStartedPageV2 = ({ location }: { location: 'onboarding' | 'workflows' }) => {
  const track = useTelemetry();
  const navigate = useNavigate();

  useEffect(() => {
    track('Get Started page visited - [Get started - V2]', { location });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <PageContainer className={css({ h: '100vh' })}>
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
            Send your first notification in less than 5 minutes
          </Title>
          <HStack
            className={css({
              marginBottom: '60px',
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
                    marginBottom: '100',
                  })}
                >
                  <Title variant="subsection">Run in your terminal to get started</Title>

                  <Link
                    className={css({
                      color: 'typography.text.secondary !important',
                    })}
                    onClick={() => {
                      track('Main docs link clicked - [Workflows empty state]');
                    }}
                    href="https://docs.novu.co/"
                    target="_blank"
                  >
                    <HStack gap="25">
                      <IconOutlineMenuBook size={16} /> <span>Learn more</span>
                    </HStack>
                  </Link>
                </HStack>
                <div
                  className={css({
                    width: '100%',
                    background: 'var(--mantine-color-gradient-outline)',
                    backgroundClip: 'padding-box',
                    border: 'none !important',
                    padding: '1px',
                    borderRadius: '100',
                    boxShadow: 'dark !important',
                  })}
                  onDoubleClick={() => {
                    track('Command copied - [Get Started - V2]');
                  }}
                >
                  <CodeSnippet
                    command="npx novu@latest dev"
                    className={css({
                      width: '100%',
                      '& input': {
                        margin: '0 !important',
                        color: 'typography.text.main !important',
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

                {location === 'onboarding' && (
                  <SkipCTA
                    text="No time right now?"
                    buttonText="Skip Onboarding"
                    onClick={() => {
                      track('Skip Onboarding Clicked', { location: 'button' });
                      navigate(ROUTES.WORKFLOWS);
                    }}
                  />
                )}

                {location === 'workflows' && (
                  <SkipCTA
                    text="Not a developer? Invite your dev team"
                    buttonText="Invite"
                    onClick={() => {
                      track('Invite devs link clicked - [Workflows empty state]');
                      navigate(ROUTES.TEAM_SETTINGS);
                    }}
                    Icon={IconGroupAdd}
                  />
                )}
              </div>
            </VStack>
          </HStack>
          <HStack
            className={css({
              marginBottom: '375',
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
                  Create a workflow
                </Title>
              </HStack>
              <Text
                className={css({
                  color: 'typography.text.secondary',
                  marginBottom: location === 'onboarding' ? '24px' : '8px',
                })}
              >
                Build real-life notification workflows and preview them locally
              </Text>

              {location === 'workflows' && (
                <BadgeButton
                  onClick={() => {
                    track('Examples link clicked - [Workflows empty state]');
                    window.open('https://docs.novu.co/guides/workflows/introduction', '_blank');
                  }}
                  className={css({
                    marginBottom: '150',
                  })}
                >
                  <IconFolderOpen
                    size={16}
                    className={css({
                      color: {
                        _dark: 'legacy.BGLight !important',
                        base: 'legacy.B20 !important',
                      },
                    })}
                  />{' '}
                  <span>Discover examples</span>
                </BadgeButton>
              )}
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
                  marginBottom: location === 'onboarding' ? '24px' : '8px',
                })}
              >
                Provide your team with no-code controls to modify notification content and behavior
              </Text>

              {location === 'workflows' && (
                <BadgeButton
                  onClick={() => {
                    track('Invite team link clicked - [Workflows empty state]');
                    navigate(ROUTES.TEAM_SETTINGS);
                  }}
                  className={css({
                    marginBottom: '150',
                  })}
                >
                  <IconGroupAdd
                    size={16}
                    className={css({
                      color: {
                        _dark: 'legacy.BGLight !important',
                        base: 'legacy.B20 !important',
                      },
                    })}
                  />{' '}
                  <span>Invite team</span>
                </BadgeButton>
              )}
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
                  Push your changes
                </Title>
              </HStack>
              <Text
                className={css({
                  color: 'typography.text.secondary',
                  marginBottom: location === 'onboarding' ? '24px' : '8px',
                })}
              >
                Use the familiar CI/CD pipeline to get your notifications to production
              </Text>

              {location === 'workflows' && (
                <BadgeButton
                  onClick={() => {
                    track('Deployment docs link clicked - [Workflows empty state]');
                    window.open('https://docs.novu.co/deployment/production', '_blank');
                  }}
                  className={css({
                    marginBottom: '150',
                  })}
                >
                  <IconOutlineMenuBook
                    size={16}
                    className={css({
                      color: {
                        _dark: 'legacy.BGLight !important',
                        base: 'legacy.B20 !important',
                      },
                    })}
                  />{' '}
                  <span>Learn more</span>
                </BadgeButton>
              )}
              <GithubAction />
            </VStack>
          </HStack>
        </div>
      </VStack>
    </PageContainer>
  );
};
