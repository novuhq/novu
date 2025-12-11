# Preferences


## Supported Types

### `string`

```typescript
const value: string = "<value>";
```

### `components.WorkflowPreferenceRequestDto`

```typescript
const value: components.WorkflowPreferenceRequestDto = {
  enabled: true,
  condition: {
    "and": [
      {
        "===": [
          {
            "var": "tier",
          },
          "premium",
        ],
      },
    ],
  },
  workflowId: "workflow-123",
};
```

### `components.GroupPreferenceFilterDto`

```typescript
const value: components.GroupPreferenceFilterDto = {
  enabled: true,
  condition: {
    "and": [
      {
        "===": [
          {
            "var": "tier",
          },
          "premium",
        ],
      },
    ],
  },
  filter: {
    workflowIds: [
      "workflow-1",
      "workflow-2",
    ],
    tags: [
      "tag1",
      "tag2",
    ],
  },
};
```

