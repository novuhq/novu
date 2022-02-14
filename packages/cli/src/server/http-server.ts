import * as http from 'http';
import { SERVER_HOST, SERVER_PORT, REDIRECT_ROUTH } from '../constants';

export class HttpServer {
  private server: http.Server;
  public token: string;
  public listen(): Promise<void> {
    return new Promise((resolve) => {
      this.server = http.createServer((req) => {
        if (req.url.startsWith(REDIRECT_ROUTH)) {
          this.token = new URLSearchParams(req.url.slice(5)).get('token');
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
