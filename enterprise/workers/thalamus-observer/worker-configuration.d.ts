declare namespace Cloudflare {
  interface Env {
    SESSION_OBSERVER: DurableObjectNamespace<import("./src/index").SessionObserver>;
    SESSION_REGISTRY: DurableObjectNamespace<import("./src/index").SessionRegistry>;
    API_KEY?: string;
  }
}
