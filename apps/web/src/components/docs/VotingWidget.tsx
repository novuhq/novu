import { ActionButton, ColorScheme, IconThumbDownAlt, IconThumbUpAlt, useColorScheme } from '@novu/design-system';
import { css, cva } from '@novu/novui/css';
import { Flex, styled } from '@novu/novui/jsx';
import { text } from '@novu/novui/recipes';
import { SystemStyleObject } from '@novu/novui/types';

const Text = styled('p', text);

export type Voting = 'up' | 'down';

export const VotingWidget = ({
  voted,
  onVoteClick,
}: {
  voted: Voting | undefined;
  onVoteClick: (vote: Voting) => () => void;
}) => {
  const { colorScheme } = useColorScheme();

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
          Icon={() => (
            <IconThumbUpAlt
              {...{ dataVote: voted }}
              className={css({
                '&[data-vote="up"]': {
                  color: {
                    base: 'legacy.white !important',
                    _dark: 'legacy.white !important',
                  },
                },
              })}
              size={20}
            />
          )}
        />
        <ActionButton
          onClick={onVoteClick('down')}
          Icon={() => (
            <IconThumbDownAlt
              {...{ dataVote: voted }}
              className={css({
                '&[data-vote="down"]': {
                  color: {
                    base: 'legacy.white !important',
                    _dark: 'legacy.white !important',
                  },
                },
              })}
              size={20}
            />
          )}
        />
      </Flex>
    </Flex>
  );
};
