## v3.20.0 (2026-11-16)

### 🚀 Features

- **dashboard:** support some, all and none conditions over arrays of objects fixes NV-9357 ([#13317](https://github.com/novuhq/novu/pull/13317))
- **api-service,dashboard,shared:** cap free organizations at 5 workflows per environment fixes NV-9385 ([#13242](https://github.com/novuhq/novu/pull/13242))
- **dashboard,notifications,docs,root:** hard-stop trial organizations at their included workflow runs fixes NV-9165 ([#13041](https://github.com/novuhq/novu/pull/13041))
- **dashboard:** run the workflow editor Copilot on the agent web-chat channel fixes NV-9137 ([#13010](https://github.com/novuhq/novu/pull/13010))
- **api-service,dashboard:** show a publish diff before promoting to Production fixes NV-9366 ([#13234](https://github.com/novuhq/novu/pull/13234))
- **providers,dashboard,shared,docs:** support Twilio API key authentication fixes NV-9200 ([#13098](https://github.com/novuhq/novu/pull/13098))
- **dashboard:** self-hosted organization creation policy and instance admin API fixes NV-9096 ([#12967](https://github.com/novuhq/novu/pull/12967))
- **api, worker, ws, dashboard:** implement TLS support across API, worker, and dashboard services with configuration options and environment validation ([#12910](https://github.com/novuhq/novu/pull/12910))
- **dashboard:** suggest the next tier when setting a usage limit fixes NV-9020 ([#12878](https://github.com/novuhq/novu/pull/12878))
- **api-service:** give Human its own email inbox and send caps fixes NV-9021 ([#12861](https://github.com/novuhq/novu/pull/12861))
- **dashboard,api-service,worker:** per-integration content overrides for chat and tool steps fixes NV-8902 ([#12786](https://github.com/novuhq/novu/pull/12786))
- **api-service:** frictionless human channel onboarding fixes NV-8850 ([#12720](https://github.com/novuhq/novu/pull/12720))
- **shared:** count billing quota and usage alerts from the period start fixes NV-8881 ([#12821](https://github.com/novuhq/novu/pull/12821))
- **api-service:** workflow-run usage limits, pause at limit and usage alert settings fixes NV-8858 ([#12740](https://github.com/novuhq/novu/pull/12740))
- **shared:** push provider content overrides with Expo schema fixes NV-8454 ([#12148](https://github.com/novuhq/novu/pull/12148))
- **shared:** add FXMacroData MCP with DCR OAuth ([#12788](https://github.com/novuhq/novu/pull/12788))
- **dashboard:** role changes, multiple owners and leave org on BetterAuth team page ([#12773](https://github.com/novuhq/novu/pull/12773))
- **dashboard,api-service:** add activity feed date and time range filter fixes NV-8801 ([#12707](https://github.com/novuhq/novu/pull/12707))
- **dashboard:** integrate Mintlify assistant widget for AI features fixes NV-8563 ([#12277](https://github.com/novuhq/novu/pull/12277))
- **human-website,api-service,dashboard:** move the invite page into a new Next.js app fixes NV-8900 ([#12764](https://github.com/novuhq/novu/pull/12764))
- **api-service,dashboard,human,dal:** invite page where the invited person picks their channel fixes NV-8893 ([#12751](https://github.com/novuhq/novu/pull/12751))
- **worker:** replace Stripe usage alerts with ClickHouse cron fixes NV-8834 ([#12696](https://github.com/novuhq/novu/pull/12696))
- **dashboard:** enhance integration conditions with workflow metadata support fixes NV-8799 ([#12702](https://github.com/novuhq/novu/pull/12702))
- **api-service:** mention-gate shared rooms and inject unseen Slack thread context fixes NV-8779 ([#12583](https://github.com/novuhq/novu/pull/12583))
- **providers:** add Google Chat provider and documentation fixes NV-8811 ([#12690](https://github.com/novuhq/novu/pull/12690))
- **api-service:** log HITL request and response in conversation activity fixes NV-8817 ([#12680](https://github.com/novuhq/novu/pull/12680))
- **root:** Add Photon (iMessage via Spectrum Cloud) channel and agent integration ([#12411](https://github.com/novuhq/novu/pull/12411))
- **dashboard:** Make web chat preview sidebar resizable ([#12595](https://github.com/novuhq/novu/pull/12595))

### 🩹 Fixes

- **dashboard:** stop agent channel setup crashing when it shows a QR code fixes NV-9463 ([#13326](https://github.com/novuhq/novu/pull/13326))
- **root:** upgrade better-auth to 1.7.19 for GHSA-965c-763c-88jm fixes NV-9293 ([#13310](https://github.com/novuhq/novu/pull/13310))
- **dashboard:** install only the dashboard's workspace in the self-hosted Docker build ([#13305](https://github.com/novuhq/novu/pull/13305))
- **dashboard:** copy pnpm patches into the self-hosted Docker build ([#13304](https://github.com/novuhq/novu/pull/13304))
- **dashboard:** show only Updated x ago on publish change cards fixes NV-9398 ([#13250](https://github.com/novuhq/novu/pull/13250))
- **dashboard:** start publish modal change sections collapsed fixes NV-9396 ([#13247](https://github.com/novuhq/novu/pull/13247))
- **dashboard:** remove shortcut badge from need a hand button fixes NV-9384 ([#13241](https://github.com/novuhq/novu/pull/13241))
- **dashboard:** simplify Mintlify embed configuration by removing versioning and integrity checks fixes NV-9308 ([#13177](https://github.com/novuhq/novu/pull/13177))
- **dashboard:** stop the agent outbound provider picker throwing a ReferenceError fixes NV-9346 ([#13214](https://github.com/novuhq/novu/pull/13214))
- **dashboard:** relative times and long-prompt layout in agent conversation lists fixes NV-9319 ([#13182](https://github.com/novuhq/novu/pull/13182))
- **dashboard:** keep Last 7 days selectable across daylight saving fixes NV-9278 ([#13129](https://github.com/novuhq/novu/pull/13129))
- **novu:** handle unknown card types with default branch fixes NV-9193 ([#13080](https://github.com/novuhq/novu/pull/13080))
- **dashboard:** update Mintlify assistant integration and improve trigger visibility handling fixes NV-9093 ([#13073](https://github.com/novuhq/novu/pull/13073))
- **dashboard:** sign web chat tester agent hash when Web Chat HMAC is enabled fixes NV-9143 ([#13021](https://github.com/novuhq/novu/pull/13021))
- **dashboard:** sign dashboard Inbox sessions when In-App HMAC is enabled fixes NV-9134 ([#13019](https://github.com/novuhq/novu/pull/13019))
- **root:** resolve high Node.js Brotli RCE, markdown-it, vite, contextprotocol and moderate sanitize-html, hono vulnerabilities fixes NV-9117 ([#12990](https://github.com/novuhq/novu/pull/12990))
- **dashboard:** enable usage limits save after the first edit fixes NOV-9101 ([#12977](https://github.com/novuhq/novu/pull/12977))
- **dashboard:** redesign help panel components and improved the functionality fixes NV-9093 ([#12961](https://github.com/novuhq/novu/pull/12961))
- **dashboard:** skip chart elements in web chat cards fixes NV-9003 ([#12848](https://github.com/novuhq/novu/pull/12848))
- **docs:** enhance Custom SMTP integration guide with detailed configuration steps and TLS settings fixes DOC-449 ([#12774](https://github.com/novuhq/novu/pull/12774))
- **dashboard:** resolve high @faker-js/faker vulnerability fixes NV-8815 ([#12674](https://github.com/novuhq/novu/pull/12674))
- **dashboard:** sms preview section should not truncate the message preview till 4 lines fixes NV-9002 ([#12873](https://github.com/novuhq/novu/pull/12873))
- **dashboard:** allow forcing Inbox socket type via VITE_WEBSOCKET_TYPE fixes NV-8989 ([#12832](https://github.com/novuhq/novu/pull/12832))
- **dashboard:** prevent Integrate workflow tab crash fixes NV-8856 ([#12731](https://github.com/novuhq/novu/pull/12731))
- **worker:** handle integration condition variables and logs fixes NV-8799 ([#12648](https://github.com/novuhq/novu/pull/12648))

### ❤️ Thank You

- Adam Chmara @ChmaraX
- Andy
- Claude Opus 5.5
- Claude Sonnet 5.5
- Cursor @cursoragent
- Cursor Agent @cursoragent
- Dima Grossman @scopsy
- George Djabarov @djabarovgeorge
- Himanshu Garg @merrcury
- Nikita Grossman @nikitagrossman
- Pawan Jain @jainpawan21
- Paweł Tymczuk @LetItRock
- Robert Tidball