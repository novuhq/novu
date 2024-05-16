import { ActionIcon } from '@mantine/core';
import { IconThumbDownAlt, IconThumbUpAlt } from '@novu/design-system';
import { css } from '../../styled-system/css';
import { Flex, styled } from '../../styled-system/jsx';
import { text } from '../../styled-system/recipes';

const Text = styled('p', text);

export const VotingWidget = ({
  voted,
  onVoteClick,
}: {
  voted: 'up' | 'down' | '';
  onVoteClick: (vote: 'up' | 'down') => () => void;
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
      <Flex gap="100" align="center">
        <ActionIcon
          className={css({
            width: '125 !important',
            minWidth: '125 !important',
            border: 'none',
          })}
          variant="transparent"
          onClick={onVoteClick('up')}
        >
          <IconThumbUpAlt color={voted === 'up' ? 'white' : undefined} size={20} />
        </ActionIcon>
        <ActionIcon
          className={css({
            width: '125 !important',
            minWidth: '125 !important',
            border: 'none',
          })}
          variant="transparent"
          onClick={onVoteClick('down')}
        >
          <IconThumbDownAlt color={voted === 'down' ? 'white' : undefined} size={20} />
        </ActionIcon>
      </Flex>
    </Flex>
  );
};
