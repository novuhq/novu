import localtunnel from "localtunnel";

export default class LocalTunnelWrapper {
  port;
  subdomain;
  tunnel;
  host;

  constructor(port, subdomain, host) {
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

  getUrl() {
    return this.tunnel.url;
  }
}
