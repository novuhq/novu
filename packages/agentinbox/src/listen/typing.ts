/**
 * "Typing…" in a conversation's chat while the host works on it. A chat shows it for a few seconds after each
 * signal (Telegram five), so it goes again every few until stopped. It never gets in the run's way: a signal that
 * fails is skipped, and a chat that has no typing (email) isn't asked again.
 */
export class Typing {
  private timer?: ReturnType<typeof setInterval>;
  private unsupported = false;

  constructor(
    private readonly signal: () => Promise<boolean>,
    private readonly everyMs: number
  ) {}

  /** Shows it now, and keeps it on until `stop`. */
  start(): void {
    if (this.timer || this.unsupported) {
      return;
    }

    this.timer = setInterval(() => this.send(), this.everyMs);
    this.timer.unref?.();
    this.send();
  }

  /** Stops it; says whether it was on. */
  stop(): boolean {
    const was = this.timer !== undefined;
    clearInterval(this.timer);
    this.timer = undefined;

    return was;
  }

  private send(): void {
    this.signal().then(
      (shown) => {
        if (!shown) {
          this.unsupported = true;
          this.stop();
        }
      },
      () => undefined
    );
  }
}
