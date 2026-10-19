# Bridge Endpoint Setup

The Bridge Endpoint is a single HTTP route on your application (`/api/novu` by default) that Novu Cloud calls to:

- Discover registered workflows (`GET`)
- Resolve step content for a given subscriber + payload (`POST`)
- Verify HMAC signatures on incoming requests
- Respond to `OPTIONS` preflight requests

Each framework ships a `serve` wrapper that handles parsing, HMAC verification, and response shaping.

## Defaults

| Default | Value |
| --- | --- |
| Path | `/api/novu` |
| Methods | `GET`, `POST`, `OPTIONS` |
| Required env var | `NOVU_SECRET_KEY` |
| HMAC | On when `NODE_ENV !== "development"` |

You may use any path. The full bridge URL becomes `<your-app-base-url><path>`. Example: `https://api.acme.com/internal/novu`.

## Next.js (App Router)

```typescript
// app/api/novu/route.ts
import { serve } from "@novu/framework/next";
import { welcomeWorkflow } from "@/novu/workflows";

export const { GET, POST, OPTIONS } = serve({
  workflows: [welcomeWorkflow],
});
```

## Next.js (Pages Router)

```typescript
// pages/api/novu.ts
import { serve } from "@novu/framework/next";
import { welcomeWorkflow } from "../../novu/workflows";

export default serve({ workflows: [welcomeWorkflow] });
```

## Express

```typescript
import express from "express";
import { serve } from "@novu/framework/express";
import { welcomeWorkflow } from "./novu/workflows";

const app = express();
app.use(express.json()); // required so Novu can parse POST bodies
app.use("/api/novu", serve({ workflows: [welcomeWorkflow] }));

app.listen(4000);
```

## NestJS

### Basic

```typescript
import { Module } from "@nestjs/common";
import { NovuModule } from "@novu/framework/nest";
import { welcomeWorkflow } from "./novu/workflows";

@Module({
  imports: [
    NovuModule.register({
      apiPath: "/api/novu",
      workflows: [welcomeWorkflow],
    }),
  ],
})
export class AppModule {}
```

### With Dependency Injection

```typescript
import { Module } from "@nestjs/common";
import { NovuModule } from "@novu/framework/nest";
import { NotificationService } from "./notification.service";
import { UserService } from "./user.service";

@Module({
  imports: [
    NovuModule.registerAsync({
      imports: [],
      useFactory: (notificationService: NotificationService) => ({
        apiPath: "/api/novu",
        workflows: [notificationService.welcomeWorkflow()],
      }),
      inject: [NotificationService],
    }),
  ],
  providers: [NotificationService, UserService],
  exports: [NotificationService],
})
export class AppModule {}
```

```typescript
import { Injectable } from "@nestjs/common";
import { workflow } from "@novu/framework";
import { z } from "zod";
import { UserService } from "./user.service";

@Injectable()
export class NotificationService {
  constructor(private readonly userService: UserService) {}

  public welcomeWorkflow() {
    return workflow(
      "welcome-email",
      async ({ step, payload }) => {
        await step.email("send-email", async () => {
          const user = this.userService.getUser(payload.userId);

          return {
            subject: `Hello, ${user.name}`,
            body: "We are glad you are here!",
          };
        });
      },
      { payloadSchema: z.object({ userId: z.string() }) }
    );
  }
}
```

## Remix

```typescript
// app/routes/api.novu.ts
import { serve } from "@novu/framework/remix";
import { welcomeWorkflow } from "../novu/workflows";

const handler = serve({ workflows: [welcomeWorkflow] });

export { handler as action, handler as loader };
```

## SvelteKit

```typescript
// src/routes/api/novu/+server.ts
import { serve } from "@novu/framework/sveltekit";
import { welcomeWorkflow } from "$lib/novu/workflows";

export const { GET, POST, OPTIONS } = serve({ workflows: [welcomeWorkflow] });
```

## Nuxt

```typescript
// server/api/novu.ts
import { serve } from "@novu/framework/nuxt";
import { welcomeWorkflow } from "~/novu/workflows";

export default defineEventHandler(serve({ workflows: [welcomeWorkflow] }));
```

## H3

```typescript
import { createApp, eventHandler, toNodeListener } from "h3";
import { createServer } from "node:http";
import { serve } from "@novu/framework/h3";
import { welcomeWorkflow } from "./novu/workflows";

const app = createApp();
app.use("/api/novu", eventHandler(serve({ workflows: [welcomeWorkflow] })));

createServer(toNodeListener(app)).listen(4000);
```

## AWS Lambda

```typescript
import { serve } from "@novu/framework/lambda";
import { welcomeWorkflow } from "./novu/workflows";

export const novu = serve({ workflows: [welcomeWorkflow] });
```

Wire `novu` to API Gateway / Lambda Function URL. Use a stable URL for the bridge — avoid generated stage URLs that rotate.

## Custom `serve` Function (Any Framework)

If your framework isn't directly supported, wrap `NovuRequestHandler`:

```typescript
import { NovuRequestHandler, ServeHandlerOptions } from "@novu/framework";
import type { Request, Response } from "express";

export const serve = (options: ServeHandlerOptions) => {
  const requestHandler = new NovuRequestHandler({
    frameworkName: "express",
    ...options,
    handler: (incomingRequest: Request, response: Response) => ({
      method: () => incomingRequest.method,
      headers: (key) => {
        const header = incomingRequest.headers[key];

        return Array.isArray(header) ? header[0] : header;
      },
      queryString: (key) => {
        const qs = incomingRequest.query[key];

        return Array.isArray(qs) ? qs[0] : qs;
      },
      body: () => incomingRequest.body,
      url: () =>
        new URL(incomingRequest.url, `https://${incomingRequest.headers.host || ""}`),
      transformResponse: ({ body, headers, status }) => {
        Object.entries(headers).forEach(([name, value]) => response.setHeader(name, value));

        return response.status(status).send(body);
      },
    }),
  });

  return requestHandler.createHandler();
};
```

The handler must implement:

| Method | Returns |
| --- | --- |
| `method()` | `"GET" \| "POST" \| "OPTIONS"` |
| `headers(key)` | `string \| undefined` |
| `queryString(key)` | `string \| undefined` |
| `body()` | parsed JSON body |
| `url()` | full `URL` object |
| `transformResponse({ body, headers, status })` | the framework's response object |

## Tunnel URL vs Bridge URL

| | Generated by | Use for |
| --- | --- | --- |
| **Tunnel URL** | `npx novu@latest dev` (e.g. `https://<id>.novu.sh/api/novu`) | Local development & Studio testing |
| **Bridge URL** | Your deployed app (e.g. `https://api.acme.com/api/novu`) | Production sync |

The tunnel ID is persisted on your machine, so the same URL is reused across `npx novu dev` runs.

## FAQ

### Does the bridge endpoint need to be publicly accessible?

Yes. Novu Cloud calls it from autoscaled workers — there's no static IP to allowlist. Use HTTPS in production.

### Can I use a path other than `/api/novu`?

Yes. Set the path you want when mounting `serve` and pass the full URL (`https://app.com/<path>`) when syncing.

### Does the bridge use my application's auth middleware?

You can place the bridge behind any middleware as long as `serve` receives untouched `GET`/`POST`/`OPTIONS` requests. **Don't** attach JWT auth to the bridge — Novu authenticates with HMAC instead.
