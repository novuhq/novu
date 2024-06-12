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

    this.tunnel.on("error", this.errorHandler);
    this.tunnel.on("close", this.closeHandler);
  }

  public getUrl() {
    return this.tunnel?.url;
  }

  private errorHandler(err: Error) {
    console.log(err);
    console.log(
      "Localtunnel seems to have crashed, the process will attempt to restart...",
    );
    process.exit(1);
  }

  private closeHandler() {
    console.log("Successfully closed the tunnel.");
  }
}
