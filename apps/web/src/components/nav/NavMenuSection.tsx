import { FC } from 'react';
import { styled } from '../../styled-system/jsx';
import { text } from '../../styled-system/recipes';
import { LocalizedMessage } from '@novu/shared-web';
import { css } from '../../styled-system/css';

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
      {children}
    </section>
  );
};
