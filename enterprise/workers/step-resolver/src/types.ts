export interface DispatchNamespaceWorker {
  fetch(request: Request): Promise<Response>;
}

export interface DispatchNamespaceBinding {
  get(name: string): DispatchNamespaceWorker;
}

export interface Env {
  DISPATCHER: DispatchNamespaceBinding;
  STEP_RESOLVER_HMAC_SECRET: string;
}
