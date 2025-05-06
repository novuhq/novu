import http from 'node:http';
import { AddressInfo } from 'net';

import getPort from 'get-port';
import { DevCommandOptions } from '../commands';

export const WELL_KNOWN_ROUTE = '/.well-known/novu';
export const STUDIO_PATH = '/studio';

export type DevServerOptions = { tunnelOrigin: string; anonymousId?: string } & Partial<
  Pick<DevCommandOptions, 'origin' | 'port' | 'studioPort' | 'studioHost' | 'dashboardUrl' | 'route'>
>;

export class DevServer {
  private server: http.Server;
  public token: string;

  constructor(private options: DevServerOptions) {}

  public async listen(): Promise<void> {
    const port = await getPort({ host: this.options.studioHost, port: Number(this.options.studioPort) });
    this.server = http.createServer();
    this.server.on('request', async (req, res) => {
      try {
        if (req.url.startsWith(WELL_KNOWN_ROUTE)) {
          this.serveWellKnownPath(req, res);
        } else if (req.url.startsWith(STUDIO_PATH)) {
          this.serveStudio(req, res);
        } else {
          res
            .writeHead(301, {
              Location: STUDIO_PATH,
            })
            .end();
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error(e);
      }
    });

    await new Promise<void>((resolve) => {
      this.server.listen(port, this.options.studioHost, () => {
        resolve();
      });
    });
  }

  public getAddress() {
    const response = this.server.address() as AddressInfo;

    return `http://${this.options.studioHost}:${response.port}`;
  }

  public getStudioAddress() {
    return `${this.getAddress()}${STUDIO_PATH}`;
  }

  public close(): void {
    this.server.close();
  }

  private serveWellKnownPath(req: http.IncomingMessage, res: http.ServerResponse) {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', this.options.dashboardUrl);
    res.end(JSON.stringify(this.options));
  }

  private serveStudio(req: http.IncomingMessage, res: http.ServerResponse) {
    const studioHTML = `
    <html class="dark">
      <head>
        <link href="${this.options.dashboardUrl}/favicon.svg" rel="icon" />
        <title>Novu Studio</title>
      </head>
      <body style="padding: 0; margin: 0; overflow: hidden;">
        <script>
          const NOVU_CLOUD_STUDIO_ORIGIN = '${this.options.dashboardUrl}';

          function injectIframe(src) {
           /*
           * Updates the URL in the parent window for better navigation control.
           * Example: If the user enters 'http://localhost:PORT/studio/onboarding/preview', it remains unchanged,
           * otherwise, redirects back to 'http://localhost:PORT/studio/onboarding'.
           */
            const getWindowsUrl = (url) => {
              const studioPath = '/studio';
              const pathname = window.location.pathname;
            
              return url.includes(studioPath) ? url.replace(studioPath, pathname) : url;
            };
            
            const iframe = window.document.createElement('iframe');
            iframe.sandbox = 'allow-forms allow-scripts allow-modals allow-same-origin allow-popups allow-popups-to-escape-sandbox'
            iframe.allow = 'clipboard-read; clipboard-write'
            iframe.style = 'width: 100%; height: 100vh; border: none;';
            
            const currentUrl = getWindowsUrl(src)
            iframe.setAttribute('src', currentUrl);
            document.body.appendChild(iframe);
            
            window.addEventListener('message', (event) => {
              if (event?.data?.type === 'pathnameChange') {
                history.replaceState(null, '', event.data?.pathname);
              }
            });

            return iframe;
          }

          function redirectToCloud() {
            // Replace the local tunnel with Novu Web Dashboard on build time.
            const url = new URL('/local-studio/auth', NOVU_CLOUD_STUDIO_ORIGIN);
            url.searchParams.set('redirect_url', window.location.href);
            url.searchParams.set('application_origin', '${this.options.origin}');
            url.searchParams.set('tunnel_origin', '${this.options.tunnelOrigin}');
            url.searchParams.set('tunnel_route', '${this.options.route}');
            url.searchParams.set('anonymous_id', '${this.options.anonymousId}');

            window.location.href = url.href;
          }

          function bootstrapLocalStudio() {
            const url = new URL(window.location.href);
            const localStudioURL = url.searchParams.get('local_studio_url');

            url.searchParams.delete('local_studio_url');
            history.replaceState({}, '', url.href);

            if (!localStudioURL) {
              return redirectToCloud();
            }

            injectIframe(localStudioURL);
          }

          bootstrapLocalStudio();
        </script>
      </body>
    </html>
  `;

    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.write(studioHTML);
    res.end();
  }
}
