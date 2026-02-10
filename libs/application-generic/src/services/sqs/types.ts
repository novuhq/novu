export interface ISqsConsumerOptions {
  maxNumberOfMessages?: number;
  waitTimeSeconds?: number;
  visibilityTimeout?: number;
  maxConcurrency?: number;
}

export interface ISqsMessageMeta {
  messageId: string;
  receiveCount: number;
}
