import React, { useContext, useEffect, useState } from 'react';
import { ActionIcon, useMantineColorScheme, Modal } from '@mantine/core';
import { useLocation } from 'react-router-dom';
import { Docs } from '../docs';
import {
  colors,
  IconOpenInNew,
  IconOutlineClose,
  IconThumbDownAlt,
  IconThumbUpAlt,
  Tooltip,
} from '@novu/design-system';
import { Flex, styled } from '../../styled-system/jsx';
import { text } from '../../styled-system/recipes';
import { css } from '../../styled-system/css';
import { useSegment } from '@novu/shared-web';

const Text = styled('p', text);

interface IDocsContext {
  setPath: (path: string) => void;
  toggle: () => void;
  enabled: boolean;
  path: string;
}

const DocsContext = React.createContext<IDocsContext>({
  setPath: () => {},
  toggle: () => {},
  enabled: false,
  path: '',
});

export const useDocsContext = (): IDocsContext => useContext(DocsContext);

export const useSetDocs = (path: string) => {
  const { setPath } = useDocsContext();
  useEffect(() => {
    setPath(path);
  }, [path, setPath]);
};

export const DocsProvider = ({ children }) => {
  const [path, setPath] = useState<string>('');
  const [open, setOpen] = useState(false);
  const [voted, setVoted] = useState('');
  const { pathname } = useLocation();
  const segment = useSegment();
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === 'dark';

  const onClose = () => {
    toggle();
  };

  useEffect(() => {
    return () => {
      setPath('');
      setVoted('');
    };
  }, [pathname]);

  const toggle = () => {
    setOpen(!open);
  };

  const onVoteClick = (vote: string) => () => {
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

  return (
    <DocsContext.Provider
      value={{
        setPath,
        toggle,
        enabled: path.length > 0,
        path,
      }}
    >
      <Modal
        opened={open}
        onClose={onClose}
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
        <Docs path={path}>
          <Flex
            className={css({
              position: 'fixed',
              top: '150',
              right: '150',
              background: 'legacy.B15',
              zIndex: 1,
              padding: '25',
              borderBottomLeftRadius: '50',
            })}
            gap="125"
          >
            <Tooltip label="Open docs website">
              <ActionIcon
                style={{
                  width: '20px  !important',
                  minWidth: '20px !important',
                  border: 'none',
                }}
                variant="transparent"
                onClick={() => {
                  window.open(`https://docs.novu.co/${path}`);
                }}
              >
                <IconOpenInNew />
              </ActionIcon>
            </Tooltip>
            <ActionIcon
              variant="transparent"
              onClick={onClose}
              style={{
                width: '20px  !important',
                minWidth: '20px !important',
                border: 'none',
              }}
            >
              <IconOutlineClose />
            </ActionIcon>
          </Flex>
        </Docs>
        <Flex
          className={css({
            marginTop: '250',
          })}
          align="center"
          gap="125"
        >
          <Text>Did you find it useful?</Text>
          <Flex gap="100" align="center">
            <ActionIcon
              style={{
                width: '20px  !important',
                minWidth: '20px',
                border: 'none',
              }}
              variant="transparent"
              onClick={onVoteClick('up')}
            >
              <IconThumbUpAlt color={voted == 'up' ? 'white' : undefined} size={20} />
            </ActionIcon>
            <ActionIcon
              style={{
                width: '20px  !important',
                minWidth: '20px',
                border: 'none',
              }}
              variant="transparent"
              onClick={onVoteClick('down')}
            >
              <IconThumbDownAlt color={voted == 'down' ? 'white' : undefined} size={20} />
            </ActionIcon>
          </Flex>
        </Flex>
      </Modal>
      {children}
    </DocsContext.Provider>
  );
};
