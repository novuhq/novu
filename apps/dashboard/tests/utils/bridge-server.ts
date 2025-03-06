import http from 'http';
import express from 'express';
import { serve, Client } from '@novu/framework/express';

export class TestBridgeServer {
  private server: express.Express;
  private app: http.Server;
  private port: number;
  public client = new Client({ strictAuthentication: false });
  private isServerRunning = false;

  constructor(port = 49999) {
    this.port = port;
  }

  private log(level: 'info' | 'error' | 'warn', message: string, ...args: any[]) {
    // eslint-disable-next-line no-console
    console[level](`[BridgeServer] ${message}`, ...args);
  }

  get serverPath() {
    return `http://0.0.0.0:${this.port}`;
  }

  async start(options) {
    if (this.isServerRunning) {
      await this.stop();
    }

    // Check if port is in use
    try {
      await new Promise((resolve, reject) => {
        const testServer = http.createServer();
        testServer.once('error', (err: NodeJS.ErrnoException) => {
          if (err.code === 'EADDRINUSE') {
            reject(new Error(`Port ${this.port} is already in use`));
          } else {
            reject(err);
          }
        });
        testServer.once('listening', () => {
          testServer.close();
          resolve(true);
        });
        testServer.listen(this.port);
      });
    } catch (error) {
      this.log('error', error.message);
      throw error;
    }

    this.server = express();
    this.server.use(express.json());

    // Logging middleware
    this.server.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
      this.log('info', `${req.method} ${req.path}`);

      return next();
    });

    // Error handling middleware
    this.server.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
      this.log('error', 'Unexpected error:', err);
      res.status(500).json({
        error: 'Internal Server Error',
        message: err.message,
        stack: err.stack,
      });
    });

    // Serve Novu workflows
    this.server.use(serve({ client: this.client, workflows: options.workflows }));

    return new Promise<void>((resolve, reject) => {
      this.app = this.server.listen(this.port, () => {
        this.isServerRunning = true;
        this.log('info', `Server started on port ${this.port}`);
        resolve();
      });

      // Handle initial connection errors
      this.app.on('error', (error: Error) => {
        this.isServerRunning = false;
        this.log('error', 'Server failed to start:', error);
        reject(error);
      });

      this.app.on('close', () => {
        this.isServerRunning = false;
        this.log('warn', 'Server closed');
      });
    });
  }

  async stop() {
    if (this.app && this.isServerRunning) {
      this.log('warn', 'Server Stopping');

      return new Promise<void>((resolve) => {
        this.app.close(() => {
          this.isServerRunning = false;
          resolve();
        });
      });
    }

    return Promise.resolve();
  }
}
