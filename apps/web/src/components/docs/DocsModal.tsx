import { IconOpenInNew, IconOutlineClose, Modal, ActionButton } from '@novu/design-system';
import { useSegment } from '../providers/SegmentProvider';
import { useEffect, useState } from 'react';
import { css } from '@novu/novui/css';
import { Flex } from '@novu/novui/jsx';
import { openInNewTab } from '../../utils';
import { Docs } from './Docs';
import { DOCS_URL } from './docs.const';
import { Voting, VotingWidget } from './VotingWidget';

export const DocsModal = ({ open, toggle, path }) => {
  const [voted, setVoted] = useState<Voting | undefined>(undefined);
  const segment = useSegment();

  useEffect(() => {
    return () => {
      setVoted(undefined);
    };
  }, [path]);

  const onVoteClick = (vote: Voting) => () => {
    if (vote) {
      segment.track('Inline docs voting used', {
        documentationPage: path,
        pageURL: window.location.href,
        vote,
      });
    }
    // if the user hits the same vote, deselect the vote.
    setVoted((_prevVote) => (_prevVote === vote ? undefined : vote));
  };

  // TODO: remove styles when modal have common style ground
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
          <Flex
            className={css({
              position: 'fixed',
              top: '150',
              right: '150',
              // TODO: update with a proper zIndex once we have refactored
              zIndex: '[1]',
              padding: '25',
              borderBottomLeftRadius: '50',
              background: 'surface.page',
            })}
            gap="75"
          >
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
