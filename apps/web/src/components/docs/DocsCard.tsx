import { useMantineColorScheme } from '@mantine/core';
import { css } from '../../styled-system/css';
import { styled } from '../../styled-system/jsx';
import { text as RText, title as RTitle } from '../../styled-system/recipes';

const CardTitle = styled('h3', RTitle);
const CardText = styled('p', RText);

export const DocsCard = ({
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
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <div
      className={css({
        background: isDark ? 'legacy.B15' : 'white',
        borderRadius: '75',
        padding: '150',
        minHeight: '144px',
        cursor: 'pointer',
      })}
      onClick={() => {
        onClick();
      }}
    >
      <Icon size={32} />
      <CardTitle className={css({ fontSize: '100', lineHeight: '150', marginBottom: '25', marginTop: '150' })}>
        {title}
      </CardTitle>
      <CardText className={css({ fontSize: '75', lineHeight: '125', color: 'legacy.B60' })}>{text}</CardText>
    </div>
  );
};
