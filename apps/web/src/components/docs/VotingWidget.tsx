import { ActionButton, ColorScheme, IconThumbDownAlt, IconThumbUpAlt, useColorScheme } from '@novu/design-system';
import { css, cva } from '@novu/novui/css';
import { Flex, styled } from '@novu/novui/jsx';
import { text } from '@novu/novui/recipes';
import { SystemStyleObject } from '@novu/novui/types';

const Text = styled('p', text);

export type Voting = 'up' | 'down';

const VotedDownButtonRecipe = cva<{
  colorScheme: Record<ColorScheme, SystemStyleObject>;
  voted: Record<Voting, SystemStyleObject>;
}>({
  compoundVariants: [
    {
      voted: 'down',
      colorScheme: 'dark',
      css: {
        color: 'legacy.white !important',
      },
    },
    {
      voted: 'down',
      colorScheme: 'light',
      css: {
        color: 'legacy.white !important',
      },
    },
  ],
});

const VotedUpButtonRecipe = cva<{
  colorScheme: Record<ColorScheme, SystemStyleObject>;
  voted: Record<Voting, SystemStyleObject>;
}>({
  compoundVariants: [
    {
      voted: 'up',
      colorScheme: 'dark',
      css: {
        color: 'legacy.white !important',
      },
    },
    {
      voted: 'up',
      colorScheme: 'light',
      css: {
        color: 'legacy.white !important',
      },
    },
  ],
});

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
          Icon={() => <IconThumbUpAlt className={VotedUpButtonRecipe({ colorScheme, voted })} size={20} />}
        />
        <ActionButton
          onClick={onVoteClick('down')}
          Icon={() => <IconThumbDownAlt className={VotedDownButtonRecipe({ colorScheme, voted })} size={20} />}
        />
      </Flex>
    </Flex>
  );
};
