import { CoreProps } from '@novu/novui';
import { styled, Flex } from '@novu/novui/jsx';
import { title as titleRecipe } from '@novu/novui/recipes';
import { LocalizedMessage } from '../../types/LocalizedMessage';

const Title = styled('h1', titleRecipe);

export interface IPageHeaderProps extends CoreProps {
  actions?: JSX.Element;
  title: LocalizedMessage;
}

export const PageHeader: React.FC<IPageHeaderProps> = ({ title, actions, className }) => {
  return (
    <Flex direction={'row'} justifyContent="space-between" className={className}>
      <Title variant={'page'}>{title}</Title>
      {actions && <div>{actions}</div>}
    </Flex>
  );
};
