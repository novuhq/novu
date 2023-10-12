import { useLocation, useParams } from 'react-router-dom';

export const useBasePath = () => {
  const { templateId = '', variantUuid = '' } = useParams<{ templateId: string; variantUuid?: string }>();
  const { pathname } = useLocation();
  // remove variantUuid param from the Url and redirect to the url without the variantUuid
  if (variantUuid && pathname.includes(variantUuid)) {
    return pathname.replace(`/${variantUuid}`, '');
  }

  return `/workflows/edit/${templateId}`;
};
