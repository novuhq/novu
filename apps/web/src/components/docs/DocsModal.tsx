import { Modal } from '@novu/design-system';
import { useEffect, useState } from 'react';
import { css } from '@novu/novui/css';
import { Flex } from '@novu/novui/jsx';
import { IconOpenInNew, IconClose } from '@novu/novui/icons';
import { IconButton } from '@novu/novui';
import { Docs } from './Docs';
import { DOCS_URL } from './docs.const';
import { Voting, VotingWidget } from './VotingWidget';
import { useLoadDocs } from './useLoadDocs';
import { useTelemetry } from '../../hooks/useNovuAPI';

export const DocsModal = ({ open, toggle, path }) => {
  const [voted, setVoted] = useState<Voting | undefined>(undefined);
  const { isLoading, data, hasLoadedSuccessfully } = useLoadDocs({ path, isEnabled: open });
  const track = useTelemetry();

  useEffect(() => {
    return () => {
      setVoted(undefined);
    };
  }, [path]);

  const onVoteClick = (vote: Voting) => () => {
    if (vote) {
      track('Inline docs voting used', {
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
        isLoading={isLoading}
        {...data}
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
            <IconButton
              as="a"
              href={`${DOCS_URL}/${path}`}
              target="_blank"
              rel="noreferrer noopener"
              Icon={IconOpenInNew}
            />
            <IconButton
              onClick={() => {
                toggle();
              }}
              Icon={IconClose}
            />
          </Flex>
        }
      >
        {hasLoadedSuccessfully ? <VotingWidget onVoteClick={onVoteClick} voted={voted} /> : null}
      </Docs>
    </Modal>
  );
};
