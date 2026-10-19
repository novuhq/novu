export type Subscriber = {
  subscriberId?: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  avatar?: string | null;
  locale?: string | null;
  data?: Record<string, unknown> | null;
};
