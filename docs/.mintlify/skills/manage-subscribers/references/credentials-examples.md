# Credentials Examples

Subscriber credentials store channel-specific tokens and webhook URLs needed for push and chat delivery.

## FCM (Firebase Cloud Messaging)

```typescript
import { Novu } from "@novu/api";

const novu = new Novu({
  secretKey: process.env.NOVU_SECRET_KEY,
});

await novu.subscribers.credentials.update(
  { 
    providerId: "fcm", 
    // use integrationIdentifier if there are multiple fcm type active integrations
    integrationIdentifier: "fcm-abc-123", 
    credentials: { deviceTokens: ["fcm-device-token-here"] } 
  },
  "subsriberId-1"
);
```

### Multiple Device Tokens

A subscriber can have multiple devices. Each device has one device tokens.

```typescript
await novu.subscribers.credentials.update(
  {
    providerId: "fcm",
    integrationIdentifier: "fcm-abc-123", 
    credentials: {
      deviceTokens: [
        "token-phone-abc",
        "token-tablet-def",
        "token-desktop-ghi",
      ],
    },
  },
  "user-123"
);
```

## APNS (Apple Push Notification Service)

```typescript
await novu.subscribers.credentials.update(
  { providerId: "apns", credentials: { deviceTokens: ["apns-device-token-xyz789"] } },
  "user-123"
);
```

## Expo Push

```typescript
await novu.subscribers.credentials.update(
  { providerId: "expo", credentials: { deviceTokens: ["ExponentPushToken[xxx]"] } },
  "user-123"
);
```


## Discord

```typescript
await novu.subscribers.credentials.update(
  { providerId: "discord", credentials: { webhookUrl: "https://discord.com/api/webhooks/123/abc" } },
  "user-123"
);
```

## cURL

```bash
curl -X PUT https://api.novu.co/v1/subscribers/user-123/credentials \
  -H "Authorization: ApiKey $NOVU_SECRET_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "providerId": "fcm",
    integrationIdentifier: "fcm-abc-123", 
    "credentials": {
      "deviceTokens": ["fcm-device-token-abc123"]
    }
  }'
```

## Important Notes

- Device tokens are set as an array — providing a new array **replaces** existing tokens in `PUT` api request and new tokens are appended in case of `PATCH` request.
- Each provider (FCM, APNS etc.) must be configured as an integration in the Novu dashboard before storing the credentials.
- Push tokens expire — For FCM and EXPO, novu handles the expiration of stale tokens. For rest other providers, user need to handle the expiry of tokens.
