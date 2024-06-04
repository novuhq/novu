import localtunnel from "localtunnel";

export default class LocalTunnelWrapper {
  port;
  subdomain;
  tunnel;

  constructor(port, subdomain) {
    this.port = port;
    this.subdomain = subdomain;
  }

  async connect() {
    this.tunnel = await localtunnel({
      port: this.port,
      subdomain: this.subdomain,
    });
  }

  getUrl() {
    return this.tunnel.url;
  }
}
