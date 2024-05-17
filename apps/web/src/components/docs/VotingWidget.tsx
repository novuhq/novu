import { ActionButton, IconThumbDownAlt, IconThumbUpAlt } from '@novu/design-system';
import { css } from '../../styled-system/css';
import { Flex, styled } from '../../styled-system/jsx';
import { text } from '../../styled-system/recipes';

const Text = styled('p', text);

export type Voting = 'up' | 'down';

export const VotingWidget = ({
  voted,
  onVoteClick,
}: {
  voted: Voting | undefined;
  onVoteClick: (vote: Voting) => () => void;
}) => {
  return (
    <Flex
      className={css({
        marginTop: '250',
      })}
      align="center"
      gap="125"
    >
      <Text>Did you find it useful?</Text>
      <Flex gap="50" align="center">
        <ActionButton
          onClick={onVoteClick('up')}
          Icon={() => <IconThumbUpAlt color={voted === 'up' ? 'white' : undefined} size={20} />}
        />
        <ActionButton
          onClick={onVoteClick('down')}
          Icon={() => <IconThumbDownAlt color={voted === 'down' ? 'white' : undefined} size={20} />}
        />
      </Flex>
    </Flex>
  );
};
