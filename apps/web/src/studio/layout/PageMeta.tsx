import { Helmet } from 'react-helmet-async';

interface IPageMetaProps {
  title?: string;
}

export const PageMeta: React.FC<IPageMetaProps> = ({ title }) => {
  return (
    <Helmet>
      <title>{title ? `${title} | ` : ``}Novu</title>
    </Helmet>
  );
};
