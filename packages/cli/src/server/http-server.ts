import * as http from 'http';
import * as open from 'open';
import { AddressInfo } from 'net';

import { SERVER_HOST, setAvailablePort, getServerPort, REDIRECT_ROUTE } from '../constants';

export class HttpServer {
  private server: http.Server;
  public token: string;
  private authResponseHandle: http.ServerResponse;

  public async listen(): Promise<void> {
    await setAvailablePort();

    this.server = http.createServer();
    this.server.on('request', async (req, res) => {
      try {
        if (req.url.startsWith(REDIRECT_ROUTE)) {
          this.handleRedirectRequest(req, res);
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error(e);
      }
    });

    this.server.listen(await getServerPort(), SERVER_HOST);
  }

  public getAddress() {
    const response = this.server.address() as AddressInfo;

    return `http://${SERVER_HOST}:${response.port}`;
  }

  public redirectResponse(): Promise<string> {
    return new Promise((resolve) => {
      const interval = setInterval(() => {
        if (this.token) {
          clearInterval(interval);
          resolve(this.token);
        }
      }, 300);
    });
  }

  public close(): void {
    this.server.close();
  }

  public redirectSuccessDashboard(url: string) {
    if (this.authResponseHandle) {
      this.authResponseHandle
        .writeHead(301, {
          Location: url,
        })
        .end();
      this.authResponseHandle = null;
    } else {
      open(url);
    }
  }

  private handleRedirectRequest(req: http.IncomingMessage, res: http.ServerResponse) {
    this.token = new URLSearchParams(req.url.slice(REDIRECT_ROUTE.length)).get('token');
    this.authResponseHandle = res;
  }
}
