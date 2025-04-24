export interface ISubscriptionError {
  subscriberId: string;
  code: string;
  message: string;
}

export interface ISubscriptionData {
  _id: string;
  topic: {
    _id: string;
    key: string;
    name: string;
  };
  subscriber: {
    _id: string;
    subscriberId: string;
    avatar?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    createdAt?: string;
    updatedAt?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface ITopicSubscriptionResult {
  data: ISubscriptionData[];
  meta: {
    totalCount: number;
    successful: number;
    failed: number;
  };
  errors?: ISubscriptionError[];
}
