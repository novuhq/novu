# DelayStepUpsertDtoControlValues

Control values for the Delay step.


## Supported Types

### `components.DelayControlDto`

```typescript
const value: components.DelayControlDto = {
  skip: {
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
};
```

### `{ [k: string]: any }`

```typescript
const value: { [k: string]: any } = {
  "key": "<value>",
  "key1": "<value>",
  "key2": "<value>",
};
```

