import { useParams } from 'react-router-dom';

export const useBasePath = () => {
  const { templateId = '' } = useParams<{ templateId: string }>();

  return `/templates/edit/${templateId}`;
};
