/** Thrown when the user presses Escape on a pre-commit channel screen to return to the picker. */
export class ConnectChannelBackError extends Error {
  constructor() {
    super('User navigated back to channel picker');
    this.name = 'ConnectChannelBackError';
  }
}
