/**
 * What a host returns after rendering into an outlet.
 *
 * `update` receives the next data whenever the engine has something new for the outlet, so the host can
 * reconcile in place. Without it the engine unmounts and mounts the outlet again on every change, which is the
 * behaviour a bare cleanup function keeps.
 */
export type OutletHandle<TArgs extends unknown[] = []> = {
  update?: (...args: TArgs) => void;
  unmount: () => void;
};

/** A renderer may return the legacy cleanup function or an {@link OutletHandle}. */
export type OutletCleanup<TArgs extends unknown[] = []> = OutletHandle<TArgs> | (() => void);

/** What a host gets back from `NovuUI.mountComponent`. */
export type MountHandle<TProps = unknown> = {
  update: (props: TProps) => void;
  unmount: () => void;
};
