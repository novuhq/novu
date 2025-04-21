import { PageMeta } from '@/components/page-meta';
import { useParams } from 'react-router-dom';

export const EditTopicPage = () => {
  const { topicId } = useParams<{ topicId: string }>();

  return (
    <>
      <PageMeta title="Edit Topic" />
      <div className="p-5">
        <h1 className="text-2xl font-bold">Edit Topic</h1>
        <p className="mt-2">This is a placeholder for the edit topic form for ID: {topicId}</p>
      </div>
    </>
  );
};
