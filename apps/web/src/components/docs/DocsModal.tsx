import { ColorScheme } from '@mantine/core';
import { IconOpenInNew, IconOutlineClose, useColorScheme, Modal, ActionButton } from '@novu/design-system';
import { useSegment } from '@novu/shared-web';
import { useEffect, useState } from 'react';
import { css, cva } from '../../styled-system/css';
import { Flex } from '../../styled-system/jsx';
import { SystemStyleObject } from '../../styled-system/types';
import { openInNewTab } from '../../utils';
import { Docs } from './Docs';
import { DOCS_URL } from './docs.const';
import { Voting, VotingWidget } from './VotingWidget';

const actionsRecipe = cva<{ colorScheme: Record<ColorScheme, SystemStyleObject> }>({
  base: {
    position: 'fixed',
    top: '150',
    right: '150',
    // TODO: update with a proper zIndex once we have refactored
    zIndex: '[1]',
    padding: '25',
    borderBottomLeftRadius: '50',
  },
  variants: {
    colorScheme: {
      light: {
        background: 'white',
      },
      dark: {
        background: 'legacy.B15',
      },
    },
  },
});

export const DocsModal = ({ open, toggle, path }) => {
  const [voted, setVoted] = useState<Voting | undefined>(undefined);
  const segment = useSegment();
  const { colorScheme } = useColorScheme();

  useEffect(() => {
    return () => {
      setVoted(undefined);
    };
  }, [path]);

  const onVoteClick = (vote: Voting) => () => {
    if (voted === undefined) {
      return;
    }
    segment.track('Inline docs voting used', {
      documentationPage: path,
      pageURL: window.location.href,
      vote,
    });
    setVoted(vote);
  };

  // TOOD: remove styles when modal have common style ground
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
    >
      <Docs
        path={path}
        actions={
          <Flex className={actionsRecipe({ colorScheme })} gap="75">
            <ActionButton
              tooltip="Open docs website"
              onClick={() => {
                openInNewTab(`${DOCS_URL}/${path}`);
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
