import { useNotifications } from '@novu/react';
import { useState, useEffect } from 'react';

export default function HooksPage() {
  const { data, archiveAll, refetch, fetchMore, hasMore } = useNotifications();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (data) {
      setIsLoading(false);
    }
  }, [data]);

  if (isLoading) {
    return <div>Loading notifications...</div>;
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <button onClick={archiveAll}>Archive all</button>
        <button onClick={refetch}>Refetch</button>
      </div>
      <ul>
        {data?.map((notification) => {
          return (
            <li key={notification.id} className="flex flex-col gap-3">
              <p>{notification.id}</p>
              <p>Created at: {new Date(notification.createdAt).toLocaleString()}</p>
            </li>
          );
        })}
      </ul>
      {hasMore && <button onClick={fetchMore}>Load More</button>}
    </div>
  );
}
