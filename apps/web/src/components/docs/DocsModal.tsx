import { colors, IconOpenInNew, IconOutlineClose, useColorScheme, Modal, ActionButton } from '@novu/design-system';
import { useSegment } from '@novu/shared-web';
import { useEffect, useState } from 'react';
import { css } from '../../styled-system/css';
import { Flex } from '../../styled-system/jsx';
import { Docs } from './Docs';
import { DOCS_URL } from './docs.const';
import { VotingWidget } from './VotingWidget';

export const DocsModal = ({ open, toggle, path }) => {
  const [voted, setVoted] = useState<'up' | 'down' | ''>('');
  const segment = useSegment();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  useEffect(() => {
    return () => {
      setVoted('');
    };
  }, [path]);

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
    <Modal
      opened={open}
      onClose={() => {
        toggle();
      }}
      styles={{
        root: {
          zIndex: 10003,
        },
        inner: {
          padding: '1.5rem !important',
        },
        body: {
          height: '100%',
          maxHeight: '100%',
        },
        modal: {
          width: 800,
          padding: '1.5rem !important',
          borderRadius: '0.75rem',
          position: 'relative',
          height: '100%',
          boxShadow: 'none',
        },
      }}
      title={undefined}
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
            gap="75"
          >
            <ActionButton
              tooltip="Open docs website"
              onClick={() => {
                window.open(`${DOCS_URL}${path}`);
              }}
              Icon={() => <IconOpenInNew />}
            />
            <ActionButton
              onClick={() => {
                toggle();
              }}
              Icon={() => <IconOutlineClose />}
            />
          </Flex>
        }
      >
        <VotingWidget onVoteClick={onVoteClick} voted={voted} />
      </Docs>
    </Modal>
  );
};
