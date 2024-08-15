import { SNSClientConfig } from '@aws-sdk/client-sns';

export type SNSConfig = SNSClientConfig & {
  accessKeyId?: string;
  secretAccessKey?: string;
  region?: string;
};
