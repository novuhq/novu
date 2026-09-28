## v2.14.0 (2026-09-28)

### 🚀 Features

- **api, worker, ws, mail:** enhance Redis configuration validators and update tests for cluster and SQS-only modes ([#12734](https://github.com/novuhq/novu/pull/12734))
- **api-service:** rich inbound message content and author metadata fixes NV-8629 ([#12728](https://github.com/novuhq/novu/pull/12728))
- **framework:** re-export Chart, Table and LinkButton card builders fixes NV-8632 ([#12727](https://github.com/novuhq/novu/pull/12727))
- **api-service,framework:** add inbound message edit/delete lifecycle fixes NV-8628 ([#12703](https://github.com/novuhq/novu/pull/12703))
- **dashboard:** enhance integration conditions with workflow metadata support fixes NV-8799 ([#12702](https://github.com/novuhq/novu/pull/12702))
- **api-service:** mention-gate shared rooms and inject unseen Slack thread context fixes NV-8779 ([#12583](https://github.com/novuhq/novu/pull/12583))
- **js,react,nextjs:** improved rendering architecture fixes NV-8839 ([#12591](https://github.com/novuhq/novu/pull/12591))
- **api-service:** implement webhook events OpenAPI definitions and associated tests fixes NV-8781 ([#12588](https://github.com/novuhq/novu/pull/12588))
- **api-service:** log HITL request and response in conversation activity fixes NV-8817 ([#12680](https://github.com/novuhq/novu/pull/12680))
- **root:** Add Photon (iMessage via Spectrum Cloud) channel and agent integration ([#12411](https://github.com/novuhq/novu/pull/12411))
- **api-service:** expose inbound message.replyTo fixes NV-8627 ([#12645](https://github.com/novuhq/novu/pull/12645))
- **api-service:** add outbound quote-reply payload fixes NV-8626 ([#12627](https://github.com/novuhq/novu/pull/12627))

### 🩹 Fixes

- **shared:** make GCS work for outbound email attachments ([#12655](https://github.com/novuhq/novu/pull/12655))
- **worker:** expose workflow variables in HTTP step conditions fixes NV-8772 ([#12675](https://github.com/novuhq/novu/pull/12675))
- **api-service:** unpark managed-agent hangs on provider-managed MCP connect fixes NV-8833 ([#12689](https://github.com/novuhq/novu/pull/12689))
- **worker:** handle integration condition variables and logs fixes NV-8799 ([#12648](https://github.com/novuhq/novu/pull/12648))
- **api-service:** preserve email thread IDs through burst processing fixes NV-8807 ([#12662](https://github.com/novuhq/novu/pull/12662))
- **api-service:** keep Photon connect provisioning off the Clerk org lookup fixes NV-8800 ([#12649](https://github.com/novuhq/novu/pull/12649))
- **api:** return 200 from set-primary to match its documented response ([#12612](https://github.com/novuhq/novu/pull/12612))
- **api:** extend quote-reply gateway routing to all capable adapters fixes NV-8794 ([#12632](https://github.com/novuhq/novu/pull/12632))
- **api-service:** enable Chat burst concurrency and Slack retry bounds fixes NV-8634 ([#12628](https://github.com/novuhq/novu/pull/12628))
- **api-service:** avoid cloning preference entities fixes NV-8768 ([#12562](https://github.com/novuhq/novu/pull/12562))

### ❤️ Thank You

- Adam Chmara @ChmaraX
- Andy
- breken
- Claude Fable 5.1
- Cursor @cursoragent
- Cursor Agent @cursoragent
- Dima Grossman @scopsy
- Himanshu Garg @merrcury
- Nikita Grossman @nikitagrossman
- Pawan Jain
- Paweł Tymczuk @LetItRock