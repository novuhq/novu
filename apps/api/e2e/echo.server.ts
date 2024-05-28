import * as http from 'http';
import * as express from 'express';
// FIXME: subpath import not working with `workspace:` protocol. Currently we need to drill into the module instead of using the ES export.
import { serve } from '../../../packages/echo/dist/src/express';
import { Echo } from '@novu/echo';

class EchoServer {
  private server: express.Express;
  private app: http.Server;
  private port = 9999;
  public echo = new Echo({ devModeBypassAuthentication: true });

  get serverPath() {
    return `http://localhost:${this.port}`;
  }

  async start() {
    this.server = express();
    this.server.use(express.json());
    this.server.use(serve({ client: this.echo }));

    this.app = await this.server.listen(this.port);
  }

  async stop() {
    await this.app.close();
  }
}

export const echoServer = new EchoServer();
