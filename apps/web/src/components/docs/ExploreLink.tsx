import { Flex, styled } from '../../styled-system/jsx';
import { text as RText } from '../../styled-system/recipes';
import { css } from '../../styled-system/css';

const Text = styled('p', RText);

export const ExploreLink = ({
  title,
  text,
  Icon,
  onClick,
}: {
  title: string;
  text: string;
  Icon: any;
  onClick: () => void;
}) => {
  return (
    <Flex
      className={css({
        cursor: 'pointer',
      })}
      align="center"
      gap="100"
      onClick={() => {
        onClick();
      }}
    >
      <Icon size={32} />
      <div>
        <Text
          className={css({
            fontSize: '75',
            lineHeight: '125',
          })}
        >
          {title}
        </Text>
        <Text
          className={css({
            fontSize: '75',
            lineHeight: '125',
            color: 'legacy.B60',
          })}
        >
          {text}
        </Text>
      </div>
    </Flex>
  );
};
