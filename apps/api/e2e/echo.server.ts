import * as http from 'http';
import * as express from 'express';
// FIXME: subpath import not working with `workspace:` protocol. Currently we need to drill into the module instead of using the ES export.
import { serve } from '../../../packages/framework/dist/express';
import { Client, Workflow } from '@novu/framework';

export type ServerStartOptions = {
  workflows: Array<Workflow>;
};

export class EchoServer {
  private server: express.Express;
  private app: http.Server;
  private port = 9999;
  public echo = new Client({ strictAuthentication: false });

  get serverPath() {
    return `http://localhost:${this.port}`;
  }

  async start(options: ServerStartOptions) {
    this.server = express();
    this.server.use(express.json());
    this.server.use(serve({ client: this.echo, workflows: options.workflows }));

    await new Promise<void>((resolve) => {
      this.app = this.server.listen(this.port, () => {
        resolve();
      });
    });
  }

  async stop() {
    if (this.app) {
      await new Promise<void>((resolve) => {
        this.app.close(() => {
          resolve();
        });
      });
    }
  }
}
