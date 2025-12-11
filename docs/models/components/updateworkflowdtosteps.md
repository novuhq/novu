# UpdateWorkflowDtoSteps


## Supported Types

### `components.InAppStepUpsertDto`

```typescript
const value: components.InAppStepUpsertDto = {
  name: "<value>",
  type: "in_app",
  controlValues: {
    "skip": {
      "and": [
        {
          "==": [
            {
              "var": "payload.tier",
            },
            "pro",
          ],
        },
        {
          "==": [
            {
              "var": "subscriber.data.role",
            },
            "admin",
          ],
        },
        {
          ">": [
            {
              "var": "payload.amount",
            },
            "4",
          ],
        },
      ],
    },
    "disableOutputSanitization": false,
  },
};
```

### `components.EmailStepUpsertDto`

```typescript
const value: components.EmailStepUpsertDto = {
  name: "<value>",
  type: "email",
  controlValues: {
    "key": "<value>",
    "key1": "<value>",
    "key2": "<value>",
  },
};
```

### `components.SmsStepUpsertDto`

```typescript
const value: components.SmsStepUpsertDto = {
  name: "<value>",
  type: "sms",
  controlValues: {
    "skip": {
      "and": [
        {
          "==": [
            {
              "var": "payload.tier",
            },
            "pro",
          ],
        },
        {
          "==": [
            {
              "var": "subscriber.data.role",
            },
            "admin",
          ],
        },
        {
          ">": [
            {
              "var": "payload.amount",
            },
            "4",
          ],
        },
      ],
    },
  },
};
```

### `components.PushStepUpsertDto`

```typescript
const value: components.PushStepUpsertDto = {
  name: "<value>",
  type: "push",
  controlValues: {
    "key": "<value>",
  },
};
```

### `components.ChatStepUpsertDto`

```typescript
const value: components.ChatStepUpsertDto = {
  name: "<value>",
  type: "chat",
  controlValues: {
    "key": "<value>",
  },
};
```

### `components.DelayStepUpsertDto`

```typescript
const value: components.DelayStepUpsertDto = {
  name: "<value>",
  type: "delay",
  controlValues: {
    "skip": {
      "and": [
        {
          "==": [
            {
              "var": "payload.tier",
            },
            "pro",
          ],
        },
        {
          "==": [
            {
              "var": "subscriber.data.role",
            },
            "admin",
          ],
        },
        {
          ">": [
            {
              "var": "payload.amount",
            },
            "4",
          ],
        },
      ],
    },
    "type": "regular",
  },
};
```

### `components.DigestStepUpsertDto`

```typescript
const value: components.DigestStepUpsertDto = {
  name: "<value>",
  type: "digest",
  controlValues: {},
};
```

### `components.CustomStepUpsertDto`

```typescript
const value: components.CustomStepUpsertDto = {
  name: "<value>",
  type: "custom",
};
```

