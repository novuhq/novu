import * as http from 'http';
import { SERVER_HOST, SERVER_PORT, REDIRECT_ROUTE } from '../constants';

export class HttpServer {
  private server: http.Server;
  public token: string;
  public listen(): Promise<void> {
    return new Promise((resolve) => {
      this.server = http.createServer((req) => {
        if (req.url.startsWith(REDIRECT_ROUTE)) {
          this.token = new URLSearchParams(req.url.slice(REDIRECT_ROUTE.length)).get('token');
        }
      });

      this.server.listen(SERVER_PORT, SERVER_HOST);
      resolve();
    });
  }

  public close(): void {
    this.server.close();
  }
}
