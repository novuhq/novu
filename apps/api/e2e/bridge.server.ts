import http from 'http';
import express from 'express';
import { serve, Client } from '@novu/framework/express';
import { type Workflow } from '@novu/framework/internal';

export type ServerStartOptions = {
  workflows: Array<Workflow>;
};

export class BridgeServer {
  private server: express.Express;
  private app: http.Server;
  private port = 9999;
  public client = new Client({ strictAuthentication: false });

  get serverPath() {
    return `http://localhost:${this.port}`;
  }

  async start(options: ServerStartOptions) {
    this.server = express();
    this.server.use(express.json());
    this.server.use(serve({ client: this.client, workflows: options.workflows }));

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
