import { Accessor, createContext, createSignal, ParentComponent, useContext } from 'solid-js';
import { NotificationStatus } from '../types';

type InboxNotificationStatusContextType = {
  setStatus: (status: NotificationStatus) => void;
  status: Accessor<NotificationStatus>;
};

const InboxNotificationStatusContext = createContext<InboxNotificationStatusContextType | undefined>(undefined);

// TODO: update this after Filter is implemented
export const InboxNotificationStatusProvider: ParentComponent = (props) => {
  const [status, setStatus] = createSignal<NotificationStatus>(NotificationStatus.UNREAD_READ);

  const setInboxNotificationStatus = (newStatus: NotificationStatus) => {
    setStatus(newStatus);
  };

  return (
    <InboxNotificationStatusContext.Provider value={{ setStatus: setInboxNotificationStatus, status }}>
      {props.children}
    </InboxNotificationStatusContext.Provider>
  );
};

export const useInboxStatusContext = () => {
  const context = useContext(InboxNotificationStatusContext);

  if (!context) {
    throw new Error('useFeedContext must be used within a FeedsProvider');
  }

  return context;
};
