import { ColorScheme, Popover } from '@mantine/core';
import { ActionButton, Button, IconOutlineMenuBook, QuickGuide, Tooltip, useColorScheme } from '@novu/design-system';
import { useSegment } from '../providers/SegmentProvider';
import { useEffect, useMemo, useState } from 'react';
import { matchPath, useLocation } from 'react-router-dom';
import { css, cva } from '@novu/novui/css';
import { Flex, styled } from '@novu/novui/jsx';
import { text, title } from '@novu/novui/recipes';
import { SystemStyleObject } from '@novu/novui/types';
import { PATHS } from './docs.const';
import { DocsModal } from './DocsModal';

const Title = styled('h3', title);
const Text = styled('p', text);

const popoverDropdownRecipe = cva<{ colorScheme: Record<ColorScheme, SystemStyleObject> }>({
  base: {
    borderRadius: '75',
  },
  variants: {
    colorScheme: {
      light: {
        boxShadow: 'dark !important',
      },
      dark: {
        background: 'legacy.B30 !important',
      },
    },
  },
});

const popoverTextRecipe = cva<{ colorScheme: Record<ColorScheme, SystemStyleObject> }>({
  base: {
    fontSize: '100',
    lineHeight: '125',
    maxWidth: '268px',
  },
  variants: {
    colorScheme: {
      light: {
        color: 'typography.text.secondary',
      },
      dark: {
        color: 'legacy.B80',
      },
    },
  },
});

const DefaultButton = ({ onClick }: { onClick: () => void }) => (
  <ActionButton
    className={css({
      height: '150 !important',
      minHeight: '150  !important',
    })}
    Icon={() => <IconOutlineMenuBook />}
    onClick={onClick}
  />
);

export const DocsButton = ({
  TriggerButton = DefaultButton,
}: {
  TriggerButton?: React.FC<{ onClick: () => void }>;
}) => {
  const { colorScheme } = useColorScheme();
  const [opened, setOpened] = useState<boolean>(false);
  const segment = useSegment();
  const [path, setPath] = useState<string>('');
  const shouldShowButton = useMemo(() => path.length > 0, [path]);
  const [docsOpen, setDocsOpen] = useState<boolean>(false);
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
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const toggle = () => {
    setDocsOpen((prevOpen) => !prevOpen);
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
    if (!shouldShowButton) {
      return;
    }
    if (localStorage.getItem('inline-docs-intro') === 'false') {
      return;
    }
    setOpened(false);
  }, [shouldShowButton]);

  if (!shouldShowButton) {
    return null;
  }

  return (
    <>
      <Tooltip disabled={opened} position="bottom" label="Inline documentation">
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
              <TriggerButton onClick={() => toggle()} />
            </Popover.Target>
            <Popover.Dropdown className={popoverDropdownRecipe({ colorScheme })}>
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
                  <Text className={popoverTextRecipe({ colorScheme })}>
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
      {/* TODO: extract the Modal root out when modal management is improved */}
      <DocsModal open={docsOpen} toggle={toggle} path={path} />
    </>
  );
};
