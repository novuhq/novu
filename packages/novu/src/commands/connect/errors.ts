export class ConnectChannelBackError extends Error {
  constructor() {
    super('User navigated back to channel picker');
    this.name = 'ConnectChannelBackError';
  }
}
