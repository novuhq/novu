export type Subscriber = {
  subscriberId?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  avatar?: string;
  data?: Record<string, any>;
  isOnline?: boolean;
  lastOnlineAt?: string;
};
