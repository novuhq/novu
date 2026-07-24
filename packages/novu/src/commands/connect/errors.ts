export class ConnectChannelBackError extends Error {
  constructor() {
    super('User navigated back to channel picker');
    this.name = 'ConnectChannelBackError';
  }
}

export class ConnectUserCancelledError extends Error {
  readonly exitCode: number;

  constructor(message = 'Connect cancelled') {
    super(message);
    this.name = 'ConnectUserCancelledError';
    this.exitCode = 130;
  }
}
