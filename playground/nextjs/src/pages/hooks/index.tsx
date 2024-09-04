import { useNotifications, usePreferences } from '@novu/react';

export default function HooksPage() {
  const {
    notifications,
    isLoading: isLoadingNotifications,
    archiveAll,
    refetch,
    fetchMore,
    hasMore,
  } = useNotifications();
  const { preferences, isLoading: isLoadingPreferences } = usePreferences();
  console.log(preferences);

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
      <ul>
        {notifications?.map((notification) => {
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
