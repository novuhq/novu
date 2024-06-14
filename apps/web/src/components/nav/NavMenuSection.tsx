import { FC } from 'react';
import { styled, Stack } from '@novu/novui/jsx';
import { text } from '@novu/novui/recipes';
import { LocalizedMessage } from '../../types/LocalizedMessage';
import { css } from '@novu/novui/css';

interface INavMenuSectionProps {
  title?: LocalizedMessage;
}

const Title = styled('h4', text);

export const NavMenuSection: FC<React.PropsWithChildren<INavMenuSectionProps>> = ({ title, children }) => {
  return (
    <section className={css({ w: '100%' })}>
      {title && (
        <Title py="75" pl="125" variant="strong" color="typography.text.tertiary" textTransform="capitalize">
          {title}
        </Title>
      )}
      <Stack gap="25">{children}</Stack>
    </section>
  );
};
