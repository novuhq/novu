import { Helmet } from 'react-helmet-async';

const DEFAULT_DESCRIPTION =
  'Novu is an open-source notification platform that empowers developers to create robust, multi-channel notifications for web and mobile apps. With powerful workflows, seamless integrations, and a flexible API-first approach, Novu enables product teams to manage notifications without breaking production.';

type Props = {
  title?: string;
  description?: string;
};

export function PageMeta({ title, description }: Props) {
  const pageTitle = title ? `${title} | Novu` : 'Novu';
  const pageDescription = description || DEFAULT_DESCRIPTION;

  return (
    <Helmet>
      <title>{pageTitle}</title>
      <meta name="description" content={pageDescription} />
      <meta property="og:title" content={pageTitle} />
      <meta property="og:description" content={pageDescription} />
    </Helmet>
  );
}
