import { Button, Text, Title } from '@novu/novui';
import { css } from '@novu/novui/css';
import {
  IconEditNote,
  IconGroupAdd,
  IconLaptopMac,
  IconOutlineMarkEmailUnread,
  IconOutlineNotificationsActive,
  IconVisibility,
} from '@novu/novui/icons';
import { HStack, styled, VStack } from '@novu/novui/jsx';
import { text } from '@novu/novui/recipes';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSegment } from '../../../components/providers/SegmentProvider';
import { ROUTES } from '../../../constants/routes';
import { CodeSnippet } from '../../../pages/get-started/components/CodeSnippet';
import { PageContainer } from '../../layout/PageContainer';
import { Development } from './Development';
import { Ide } from './ide';
import { Studio } from './Studio';

const Link = styled('a', text);

export const GetStartedPageV2 = () => {
  const segment = useSegment();
  const navigate = useNavigate();

  useEffect(() => {
    segment.track('Get Started page visited - [Get started - V2]');
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
              color: 'typography.text.secondary',
            })}
            textAlign="center"
          >
            No workflows yet? Start building workflows locally.
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
                <Title variant="subsection">Run this in your terminal to get started</Title>
                <div
                  style={{ width: '100%' }}
                  onDoubleClick={() => {
                    segment.track('Command copied - [Get Started - V2]');
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
                      segment.track('Command copied - [Get Started - V2]');
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
              Not an engineer? Invite your dev team to set up
            </Text>
            <Link
              className={css({
                color: 'typography.text.secondary !important',
              })}
              onClick={() => {
                segment.track('Invite button clicked - [Get Started - V2]');
                navigate(ROUTES.TEAM_SETTINGS);
              }}
            >
              <HStack gap="25">
                <IconGroupAdd /> <span>Invite team</span>
              </HStack>
            </Link>
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
                  marginBottom: '150',
                })}
              >
                Leverage familiar environment
              </Text>
              <Ide />
            </VStack>
            <VStack gap="0" className={css({ width: '17.5rem', alignItems: 'flex-start' })}>
              <HStack gap="50">
                <IconVisibility />
                <Title
                  variant="subsection"
                  className={css({
                    color: 'typography.text.secondary',
                    marginBottom: '25',
                  })}
                >
                  Preview your local builds
                </Title>
              </HStack>
              <Text
                className={css({
                  color: 'typography.text.secondary',
                  marginBottom: '150',
                })}
              >
                Studio mirrors your local development
              </Text>
              <Studio />
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
                  marginBottom: '150',
                })}
              >
                Polish content in dev before release.
              </Text>
              <Development />
            </VStack>
          </HStack>
        </div>
      </VStack>
    </PageContainer>
  );
};
