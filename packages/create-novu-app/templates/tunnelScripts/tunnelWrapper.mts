import localtunnel from "localtunnel";

export interface ITunnelWrapper {
  connect(): Promise<void>;
  getUrl(): string | undefined;
}

export default class LocalTunnelWrapper implements ITunnelWrapper {
  private port: number;
  private subdomain: string;
  private tunnel: localtunnel.Tunnel | undefined;
  private host: string;

  constructor(port: number, subdomain: string, host: string) {
    this.port = port;
    this.subdomain = subdomain;
    this.host = host;
  }

  async connect() {
    this.tunnel = await localtunnel({
      port: this.port,
      subdomain: this.subdomain,
      host: this.host,
    });
  }

  public getUrl() {
    return this.tunnel?.url;
  }
}
