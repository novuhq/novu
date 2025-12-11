<!-- Start SDK Example Usage [usage] -->
### Trigger Notification Event

```typescript
import { Novu } from "@novu/api";

const novu = new Novu({
  security: {
    secretKey: "YOUR_SECRET_KEY_HERE",
  },
});

async function run() {
  const result = await novu.trigger({
    workflowId: "workflow_identifier",
    payload: {
      "comment_id": "string",
      "post": {
        "text": "string",
      },
    },
    overrides: {},
    to: "SUBSCRIBER_ID",
    actor: "<value>",
    context: {
      "key": "org-acme",
    },
  });

  console.log(result);
}

run();

```

### Cancel Triggered Event

```typescript
import { Novu } from "@novu/api";

const novu = new Novu({
  security: {
    secretKey: "YOUR_SECRET_KEY_HERE",
  },
});

async function run() {
  const result = await novu.cancel("<id>");

  console.log(result);
}

run();

```

### Broadcast Event to All

```typescript
import { Novu } from "@novu/api";

const novu = new Novu({
  security: {
    secretKey: "YOUR_SECRET_KEY_HERE",
  },
});

async function run() {
  const result = await novu.triggerBroadcast({
    name: "<value>",
    payload: {
      "comment_id": "string",
      "post": {
        "text": "string",
      },
    },
    overrides: {
      additionalProperties: {
        "fcm": {
          "data": {
            "key": "value",
          },
        },
      },
    },
    actor: {
      firstName: "John",
      lastName: "Doe",
      email: "john.doe@example.com",
      phone: "+1234567890",
      avatar: "https://example.com/avatar.jpg",
      locale: "en-US",
      timezone: "America/New_York",
      subscriberId: "<id>",
    },
    context: {
      "key": "org-acme",
    },
  });

  console.log(result);
}

run();

```

### Trigger Notification Events in Bulk

```typescript
import { Novu } from "@novu/api";

const novu = new Novu({
  security: {
    secretKey: "YOUR_SECRET_KEY_HERE",
  },
});

async function run() {
  const result = await novu.triggerBulk({
    events: [
      {
        workflowId: "workflow_identifier",
        payload: {
          "comment_id": "string",
          "post": {
            "text": "string",
          },
        },
        overrides: {},
        to: "SUBSCRIBER_ID",
        actor: {
          firstName: "John",
          lastName: "Doe",
          email: "john.doe@example.com",
          phone: "+1234567890",
          avatar: "https://example.com/avatar.jpg",
          locale: "en-US",
          timezone: "America/New_York",
          subscriberId: "<id>",
        },
        context: {
          "key": "org-acme",
        },
      },
    ],
  });

  console.log(result);
}

run();

```
<!-- End SDK Example Usage [usage] -->