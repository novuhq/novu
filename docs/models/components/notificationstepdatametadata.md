# NotificationStepDataMetadata

Metadata associated with the workflow step. Can vary based on the type of step.


## Supported Types

### `components.DigestRegularMetadata`

```typescript
const value: components.DigestRegularMetadata = {
  type: "regular",
};
```

### `components.DigestTimedMetadata`

```typescript
const value: components.DigestTimedMetadata = {
  type: "timed",
};
```

### `components.DelayRegularMetadata`

```typescript
const value: components.DelayRegularMetadata = {
  type: "regular",
};
```

### `components.DelayScheduledMetadata`

```typescript
const value: components.DelayScheduledMetadata = {
  type: "scheduled",
  delayPath: "<value>",
};
```

