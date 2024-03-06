import { Group } from '@mantine/core';
import { Container } from '@novu/design-system';
import { css } from '../../../styled-system/css';
import { styled } from '../../../styled-system/jsx';
import { title as titleRecipe } from '../../../styled-system/recipes';

const Title = styled('h2', titleRecipe);

const containerStyles = css({ bg: 'surface.page' });

function PageHeader({ actions, title }: { actions?: JSX.Element; title: string }) {
  return (
    <Container fluid sx={{ padding: '20px 24px' }} className={containerStyles}>
      <Group position="apart">
        <Title variant={'subsection'}>{title}</Title>
        {actions && <div>{actions}</div>}
      </Group>
    </Container>
  );
}

export default PageHeader;
