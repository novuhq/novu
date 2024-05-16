import { ActionIcon, Popover } from '@mantine/core';
import { Button, IconOutlineMenuBook, QuickGuide, Tooltip, useColorScheme } from '@novu/design-system';
import { useSegment } from '@novu/shared-web';
import { useEffect, useState } from 'react';
import { css } from '../../styled-system/css';
import { Flex, styled } from '../../styled-system/jsx';
import { text, title } from '../../styled-system/recipes';
import { useDocsContext } from '../providers/DocsProvider';

const Title = styled('h3', title);
const Text = styled('p', text);

export const DocsButton = () => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { toggle, enabled, path } = useDocsContext();
  const [opened, setOpened] = useState<boolean>(false);
  const segment = useSegment();

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
  );
};
