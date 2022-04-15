import { Helmet } from 'react-helmet';

type Props = {
  title?: string;
};

function PageMeta({ title }: Props) {
  return (
    <Helmet>
      <title>{title ? `${title} | ` : ``}Novu Manage Platform</title>
    </Helmet>
  );
}

export default PageMeta;
