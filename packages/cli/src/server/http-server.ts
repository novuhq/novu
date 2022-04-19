import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import * as open from 'open';
import { AddressInfo } from 'net';

import {
  SERVER_HOST,
  REDIRECT_ROUTE,
  WIDGET_DEMO_ROUTH,
  setAvailablePort,
  getServerPort,
  TRIGGER_ROUTE,
  API_TRIGGER_URL,
} from '../constants';
import { ConfigService } from '../services';

export class HttpServer {
  private server: http.Server;
  public token: string;
  private config: ConfigService = new ConfigService();
  private authResponseHandle: http.ServerResponse;

  public async listen(): Promise<void> {
    await setAvailablePort();

    this.server = http.createServer();
    this.server.on('request', async (req, res) => {
      try {
        if (req.url.startsWith(TRIGGER_ROUTE)) {
          this.handleTriggerRoute(req, res);
        }
        if (req.url.startsWith(REDIRECT_ROUTE)) {
          this.handleRedirectRequest(req, res);
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

  private async handleTriggerRoute(req: http.IncomingMessage, res: http.ServerResponse) {
    await axios.post(
      API_TRIGGER_URL,
      {
        name: this.getPayloadValue('name'),
        to: {
          subscriberId: this.getPayloadValue('subscriberId'),
          firstName: this.getPayloadValue('firstName'),
          lastName: this.getPayloadValue('lastName'),
        },
        payload: {
          token: this.getPayloadValue('token'),
        },
      },
      {
        headers: {
          Authorization: `ApiKey ${this.getPayloadValue('apiKey')}`,
        },
      }
    );

    res.statusCode = 201;
    res.end('Success');
  }

  private getPayloadValue(key: string) {
    const payload = this.config.getValue('triggerPayload');
    const parsedPayload = JSON.parse(payload);

    return parsedPayload.find((item) => item.key === key).value;
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
  if (param.key.includes('$')) {
    strToReplace += `\\`;
  }
  strToReplace += param.key;

  return new RegExp(strToReplace, 'g');
}
