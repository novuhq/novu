import React, { useContext, useEffect, useState } from 'react';
import { ActionIcon, Modal } from '@mantine/core';
import { useLocation } from 'react-router-dom';
import { Docs } from '../docs';
import { colors, IconOpenInNew, IconOutlineClose, Tooltip, useColorScheme } from '@novu/design-system';
import { Flex } from '../../styled-system/jsx';
import { css } from '../../styled-system/css';
import { useSegment } from '@novu/shared-web';
import { VotingWidget } from '../docs/VotingWidget';

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
  const [voted, setVoted] = useState<'up' | 'down' | ''>('');
  const { pathname } = useLocation();
  const segment = useSegment();
  const { colorScheme } = useColorScheme();
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
                    window.open(`https://docs.novu.co/${path}`);
                  }}
                >
                  <IconOpenInNew />
                </ActionIcon>
              </Tooltip>
              <ActionIcon
                variant="transparent"
                onClick={onClose}
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
      {children}
    </DocsContext.Provider>
  );
};
