import { ActionIcon, Modal, Popover } from '@mantine/core';
import {
  Button,
  colors,
  IconOpenInNew,
  IconOutlineClose,
  IconOutlineMenuBook,
  QuickGuide,
  Tooltip,
  useColorScheme,
} from '@novu/design-system';
import { ROUTES, useSegment } from '@novu/shared-web';
import { useEffect, useMemo, useState } from 'react';
import { matchPath, useLocation } from 'react-router-dom';
import { css } from '../../styled-system/css';
import { Flex, styled } from '../../styled-system/jsx';
import { text, title } from '../../styled-system/recipes';
import { DOCS_URL, PATHS } from './docs.const';
import { Docs } from './Docs';
import { VotingWidget } from './VotingWidget';

const Title = styled('h3', title);
const Text = styled('p', text);

export const DocsButton = () => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [opened, setOpened] = useState<boolean>(false);
  const segment = useSegment();
  const [path, setPath] = useState<string>('');
  const enabled = useMemo(() => path.length > 0, [path]);
  const [docsOpen, setDocsOpen] = useState<boolean>(false);
  const [voted, setVoted] = useState<'up' | 'down' | ''>('');
  const { pathname } = useLocation();

  useEffect(() => {
    for (const route in PATHS) {
      if (matchPath(route, pathname) !== null) {
        setPath(PATHS[route]);
        break;
      }
    }

    return () => {
      setPath('');
      setVoted('');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const toggle = () => {
    setDocsOpen(!docsOpen);
  };

  const onVoteClick = (vote: 'up' | 'down') => () => {
    if (voted.length > 0) {
      return;
    }
    segment.track('Inline docs voting used', {
      documentationPage: path,
      pageURL: window.location.href,
      vote,
    });
    setVoted(vote);
  };

  const onClose = () => {
    setOpened(false);
    localStorage.setItem('inline-docs-intro', 'false');
    segment.track('Inline docs tooltip shown', {
      documentationPage: path,
      pageURL: window.location.href,
    });
  };

  useEffect(() => {
    if (!enabled) {
      return;
    }
    if (localStorage.getItem('inline-docs-intro') === 'false') {
      return;
    }
    setOpened(false);
  }, [enabled]);

  if (!enabled) {
    return null;
  }

  return (
    <>
      <Tooltip disabled={opened} label="Inline documentation">
        <div>
          <Popover
            closeOnClickOutside={false}
            opened={opened}
            onClose={onClose}
            arrowOffset={16}
            position="bottom-end"
            withArrow
          >
            <Popover.Target>
              <ActionIcon variant="transparent" onClick={() => toggle()}>
                <IconOutlineMenuBook />
              </ActionIcon>
            </Popover.Target>
            <Popover.Dropdown
              className={css({
                borderRadius: '75',
                boxShadow: isDark ? undefined : 'dark',
                background: isDark ? 'legacy.B30' : undefined,
              })}
            >
              <Flex gap="125" justify="space-between">
                <QuickGuide />
                <div>
                  <Title
                    className={css({
                      marginBottom: '50',
                      fontSize: '88',
                      lineHeight: '150',
                    })}
                  >
                    Discover inline documentation
                  </Title>
                  <Text
                    className={css({
                      color: isDark ? 'legacy.B80' : 'typography.text.secondary',
                      fontSize: '100',
                      lineHeight: '125',
                      maxWidth: '268px',
                    })}
                  >
                    Need help? Get details and dive deeper with our inline docs.
                  </Text>
                </div>
              </Flex>
              <Flex
                className={css({
                  marginTop: '150',
                })}
                justify="end"
              >
                <Button
                  onClick={onClose}
                  className={css({
                    height: '200',
                    padding: '0 75',
                  })}
                >
                  Got it
                </Button>
              </Flex>
            </Popover.Dropdown>
          </Popover>
        </div>
      </Tooltip>
      <Modal
        opened={docsOpen}
        onClose={() => {
          toggle();
        }}
        styles={{
          root: {
            zIndex: 10003,
          },
          inner: {
            padding: '24px',
          },
          body: {
            height: '100%',
            maxHeight: '100%',
          },
          modal: {
            width: 800,
            padding: '24px !important',
            borderRadius: 12,
            position: 'relative',
            height: '100%',
          },
        }}
        overflow="inside"
        withCloseButton={false}
        overlayColor={isDark ? colors.BGDark : colors.BGLight}
      >
        <Docs
          path={path}
          actions={
            <Flex
              className={css({
                position: 'fixed',
                top: '150',
                right: '150',
                background: isDark ? 'legacy.B15' : 'white',
                zIndex: 1,
                padding: '25',
                borderBottomLeftRadius: '50',
              })}
              gap="125"
            >
              <Tooltip label="Open docs website">
                <ActionIcon
                  className={css({
                    width: '125 !important',
                    minWidth: '125 !important',
                    border: 'none',
                  })}
                  variant="transparent"
                  onClick={() => {
                    window.open(`${DOCS_URL}${path}`);
                  }}
                >
                  <IconOpenInNew />
                </ActionIcon>
              </Tooltip>
              <ActionIcon
                variant="transparent"
                onClick={() => {
                  toggle();
                }}
                className={css({
                  width: '125 !important',
                  minWidth: '125 !important',
                  border: 'none',
                })}
              >
                <IconOutlineClose />
              </ActionIcon>
            </Flex>
          }
        >
          <VotingWidget onVoteClick={onVoteClick} voted={voted} />
        </Docs>
      </Modal>
    </>
  );
};
