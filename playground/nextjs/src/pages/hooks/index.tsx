import { NovuProvider, useNotifications, usePreferences, useCounts } from '@novu/react';
import { novuConfig } from '@/utils/config';

const Content = (props: any) => {
  const {
    notifications,
    isLoading: isLoadingNotifications,
    archiveAll,
    refetch,
    fetchMore,
    hasMore,
  } = useNotifications({ archived: false });
  const { preferences, isLoading: isLoadingPreferences } = usePreferences();
  const counts = useCounts({ filters: [{}] });

  if (isLoadingNotifications || isLoadingPreferences) {
    return <div>Loading...</div>;
  }

  return (
    <div className="flex flex-col gap-8">
      <h1>Notifications</h1>
      <div className="flex flex-col gap-2">
        <button onClick={archiveAll}>Archive all</button>
        <button onClick={refetch}>Refetch</button>
      </div>
      <ul className="flex flex-col gap-4">
        {notifications?.map((notification) => {
          return (
            <li key={notification.id} className="flex flex-col">
              <p>{notification.id}</p>
              <p>Created at: {new Date(notification.createdAt).toLocaleString()}</p>
            </li>
          );
        })}
      </ul>
      {hasMore && <button onClick={fetchMore}>Load More</button>}
    </div>
  );
};

export default function HooksPage() {
  return (
    <NovuProvider {...novuConfig}>
      <Content />
    </NovuProvider>
  );
}
