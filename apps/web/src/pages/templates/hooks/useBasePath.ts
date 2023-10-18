import { useParams } from 'react-router-dom';

export const useBasePath = () => {
  const { templateId = '' } = useParams<{ templateId: string }>();

  return `/workflows/edit/${templateId}`;
};
