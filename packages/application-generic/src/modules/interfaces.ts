export interface IDestroy {
  gracefulShutdown?: () => Promise<void>;
  onModuleDestroy: () => Promise<void>;
}
