import { type LocalizedString } from '@novu/novui';
import { Helmet } from 'react-helmet-async';

export interface IPageMetaProps {
  title?: LocalizedString;
}

export const PageMeta: React.FC<IPageMetaProps> = ({ title }) => {
  return (
    <Helmet>
      <title>{title ? `${title} | ` : ``}Novu</title>
    </Helmet>
  );
};
