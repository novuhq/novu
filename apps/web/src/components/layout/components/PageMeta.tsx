import { Helmet } from 'react-helmet-async';

type Props = {
  title?: string;
};

function PageMeta({ title }: Props) {
  return (
    <Helmet>
      <title>{title ? `${title} | ` : ``}Novu Manage Platform</title>
      {!!process?.env?.REACT_APP_PLAUSIBLE_DOMAIN && (
        <script
          defer
          data-domain={new URL(window.location.href).hostname}
          src={`${process.env.REACT_APP_PLAUSIBLE_DOMAIN}/js/script.tagged-events.js`}
        />
      )}
    </Helmet>
  );
}

export default PageMeta;
