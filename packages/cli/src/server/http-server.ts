import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import { SERVER_HOST, REDIRECT_ROUTE, WIDGET_DEMO_ROUTH, setAvailablePort, getServerPort } from '../constants';
import { ConfigService } from '../services';

export class HttpServer {
  private server: http.Server;
  public token: string;
  private config: ConfigService = new ConfigService();

  public async listen(): Promise<void> {
    await setAvailablePort();

    this.server = http.createServer();
    this.server.on('request', async (req, res) => {
      try {
        if (req.url.startsWith(REDIRECT_ROUTE)) {
          this.handleRedirectRequest(req);
        }
        if (req.url.startsWith(WIDGET_DEMO_ROUTH)) {
          await this.handleWidgetDemo(res);
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error(e);
      }
    });

    this.server.listen(await getServerPort(), SERVER_HOST);
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

  private handleRedirectRequest(req: http.IncomingMessage) {
    this.token = new URLSearchParams(req.url.slice(REDIRECT_ROUTE.length)).get('token');
  }

  private async handleWidgetDemo(res: http.ServerResponse): Promise<void> {
    return new Promise((resolve, reject) => {
      const dashboardPath = path.resolve(__dirname, '../constants/dashboard/index.html');

      fs.readFile(dashboardPath, 'utf8', (error, content) => {
        if (error) {
          if (error.code === 'ENOENT') {
            res.end('404', 'utf-8');

            return reject(new Error('ENOENT'));
          }
          res.end('500');

          return reject(new Error(error.message));
        }
        const payLoad = JSON.parse(this.config.getValue('triggerPayload'));

        if (!payLoad) {
          res.end('500');

          return reject(new Error('Missing payload (500)'));
        }

        payLoad.forEach((param) => {
          const regToReplace = buildReplaceReg(param);

          // eslint-disable-next-line no-param-reassign
          content = content.replace(regToReplace, param.value);
        });

        res.writeHead(200);
        res.end(content, 'utf-8');

        return resolve();
      });
    });
  }
}

function buildReplaceReg(param) {
  let strToReplace = '';

  strToReplace += 'REPLACE_WITH_';
  if (param.key.includes('$')) strToReplace += `\\`;
  strToReplace += param.key;

  return new RegExp(strToReplace, 'g');
}
