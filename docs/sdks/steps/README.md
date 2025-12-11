# Workflows.Steps

## Overview

### Available Operations

* [generatePreview](#generatepreview) - Generate step preview
* [retrieve](#retrieve) - Retrieve workflow step

## generatePreview

Generates a preview for a specific workflow step by its unique identifier **stepId**

### Example Usage

<!-- UsageSnippet language="typescript" operationID="WorkflowController_generatePreview" method="post" path="/v2/workflows/{workflowId}/step/{stepId}/preview" -->
```typescript
import { Novu } from "@novu/api";

const novu = new Novu({
  security: {
    secretKey: "YOUR_SECRET_KEY_HERE",
  },
});

async function run() {
  const result = await novu.workflows.steps.generatePreview({
    workflowId: "<id>",
    stepId: "<id>",
    generatePreviewRequestDto: {
      previewPayload: {
        subscriber: {
          channels: [
            {
              providerId: "novu-slack",
              credentials: {
                webhookUrl: "https://example.com/webhook",
                channel: "general",
                deviceTokens: [
                  "token1",
                  "token2",
                  "token3",
                ],
                alertUid: "12345-abcde",
                title: "Critical Alert",
                imageUrl: "https://example.com/image.png",
                state: "resolved",
                externalUrl: "https://example.com/details",
              },
              integrationId: "<id>",
            },
          ],
        },
        context: {
          "key": "org-acme",
        },
      },
    },
  });

  console.log(result);
}

run();
```

### Standalone function

The standalone function version of this method:

```typescript
import { NovuCore } from "@novu/api/core.js";
import { workflowsStepsGeneratePreview } from "@novu/api/funcs/workflowsStepsGeneratePreview.js";

// Use `NovuCore` for best tree-shaking performance.
// You can create one instance of it to use across an application.
const novu = new NovuCore({
  security: {
    secretKey: "YOUR_SECRET_KEY_HERE",
  },
});

async function run() {
  const res = await workflowsStepsGeneratePreview(novu, {
    workflowId: "<id>",
    stepId: "<id>",
    generatePreviewRequestDto: {
      previewPayload: {
        subscriber: {
          channels: [
            {
              providerId: "novu-slack",
              credentials: {
                webhookUrl: "https://example.com/webhook",
                channel: "general",
                deviceTokens: [
                  "token1",
                  "token2",
                  "token3",
                ],
                alertUid: "12345-abcde",
                title: "Critical Alert",
                imageUrl: "https://example.com/image.png",
                state: "resolved",
                externalUrl: "https://example.com/details",
              },
              integrationId: "<id>",
            },
          ],
        },
        context: {
          "key": "org-acme",
        },
      },
    },
  });
  if (res.ok) {
    const { value: result } = res;
    console.log(result);
  } else {
    console.log("workflowsStepsGeneratePreview failed:", res.error);
  }
}

run();
```

### React hooks and utilities

This method can be used in React components through the following hooks and
associated utilities.

> Check out [this guide][hook-guide] for information about each of the utilities
> below and how to get started using React hooks.

[hook-guide]: ../../../REACT_QUERY.md

```tsx
import {
  // Mutation hook for triggering the API call.
  useWorkflowsStepsGeneratePreviewMutation
} from "@novu/api/react-query/workflowsStepsGeneratePreview.js";
```

### Parameters

| Parameter                                                                                                                                                                      | Type                                                                                                                                                                           | Required                                                                                                                                                                       | Description                                                                                                                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `request`                                                                                                                                                                      | [operations.WorkflowControllerGeneratePreviewRequest](../../models/operations/workflowcontrollergeneratepreviewrequest.md)                                                     | :heavy_check_mark:                                                                                                                                                             | The request object to use for the request.                                                                                                                                     |
| `options`                                                                                                                                                                      | RequestOptions                                                                                                                                                                 | :heavy_minus_sign:                                                                                                                                                             | Used to set various options for making HTTP requests.                                                                                                                          |
| `options.fetchOptions`                                                                                                                                                         | [RequestInit](https://developer.mozilla.org/en-US/docs/Web/API/Request/Request#options)                                                                                        | :heavy_minus_sign:                                                                                                                                                             | Options that are passed to the underlying HTTP request. This can be used to inject extra headers for examples. All `Request` options, except `method` and `body`, are allowed. |
| `options.retries`                                                                                                                                                              | [RetryConfig](../../lib/utils/retryconfig.md)                                                                                                                                  | :heavy_minus_sign:                                                                                                                                                             | Enables retrying HTTP requests under certain failure conditions.                                                                                                               |

### Response

**Promise\<[operations.WorkflowControllerGeneratePreviewResponse](../../models/operations/workflowcontrollergeneratepreviewresponse.md)\>**

### Errors

| Error Type                             | Status Code                            | Content Type                           |
| -------------------------------------- | -------------------------------------- | -------------------------------------- |
| errors.ErrorDto                        | 414                                    | application/json                       |
| errors.ErrorDto                        | 400, 401, 403, 404, 405, 409, 413, 415 | application/json                       |
| errors.ValidationErrorDto              | 422                                    | application/json                       |
| errors.ErrorDto                        | 500                                    | application/json                       |
| errors.SDKError                        | 4XX, 5XX                               | \*/\*                                  |

## retrieve

Retrieves data for a specific step in a workflow

### Example Usage

<!-- UsageSnippet language="typescript" operationID="WorkflowController_getWorkflowStepData" method="get" path="/v2/workflows/{workflowId}/steps/{stepId}" -->
```typescript
import { Novu } from "@novu/api";

const novu = new Novu({
  security: {
    secretKey: "YOUR_SECRET_KEY_HERE",
  },
});

async function run() {
  const result = await novu.workflows.steps.retrieve("<id>", "<id>");

  console.log(result);
}

run();
```

### Standalone function

The standalone function version of this method:

```typescript
import { NovuCore } from "@novu/api/core.js";
import { workflowsStepsRetrieve } from "@novu/api/funcs/workflowsStepsRetrieve.js";

// Use `NovuCore` for best tree-shaking performance.
// You can create one instance of it to use across an application.
const novu = new NovuCore({
  security: {
    secretKey: "YOUR_SECRET_KEY_HERE",
  },
});

async function run() {
  const res = await workflowsStepsRetrieve(novu, "<id>", "<id>");
  if (res.ok) {
    const { value: result } = res;
    console.log(result);
  } else {
    console.log("workflowsStepsRetrieve failed:", res.error);
  }
}

run();
```

### React hooks and utilities

This method can be used in React components through the following hooks and
associated utilities.

> Check out [this guide][hook-guide] for information about each of the utilities
> below and how to get started using React hooks.

[hook-guide]: ../../../REACT_QUERY.md

```tsx
import {
  // Query hooks for fetching data.
  useWorkflowsStepsRetrieve,
  useWorkflowsStepsRetrieveSuspense,

  // Utility for prefetching data during server-side rendering and in React
  // Server Components that will be immediately available to client components
  // using the hooks.
  prefetchWorkflowsStepsRetrieve,
  
  // Utilities to invalidate the query cache for this query in response to
  // mutations and other user actions.
  invalidateWorkflowsStepsRetrieve,
  invalidateAllWorkflowsStepsRetrieve,
} from "@novu/api/react-query/workflowsStepsRetrieve.js";
```

### Parameters

| Parameter                                                                                                                                                                      | Type                                                                                                                                                                           | Required                                                                                                                                                                       | Description                                                                                                                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `workflowId`                                                                                                                                                                   | *string*                                                                                                                                                                       | :heavy_check_mark:                                                                                                                                                             | N/A                                                                                                                                                                            |
| `stepId`                                                                                                                                                                       | *string*                                                                                                                                                                       | :heavy_check_mark:                                                                                                                                                             | N/A                                                                                                                                                                            |
| `idempotencyKey`                                                                                                                                                               | *string*                                                                                                                                                                       | :heavy_minus_sign:                                                                                                                                                             | A header for idempotency purposes                                                                                                                                              |
| `options`                                                                                                                                                                      | RequestOptions                                                                                                                                                                 | :heavy_minus_sign:                                                                                                                                                             | Used to set various options for making HTTP requests.                                                                                                                          |
| `options.fetchOptions`                                                                                                                                                         | [RequestInit](https://developer.mozilla.org/en-US/docs/Web/API/Request/Request#options)                                                                                        | :heavy_minus_sign:                                                                                                                                                             | Options that are passed to the underlying HTTP request. This can be used to inject extra headers for examples. All `Request` options, except `method` and `body`, are allowed. |
| `options.retries`                                                                                                                                                              | [RetryConfig](../../lib/utils/retryconfig.md)                                                                                                                                  | :heavy_minus_sign:                                                                                                                                                             | Enables retrying HTTP requests under certain failure conditions.                                                                                                               |

### Response

**Promise\<[operations.WorkflowControllerGetWorkflowStepDataResponse](../../models/operations/workflowcontrollergetworkflowstepdataresponse.md)\>**

### Errors

| Error Type                             | Status Code                            | Content Type                           |
| -------------------------------------- | -------------------------------------- | -------------------------------------- |
| errors.ErrorDto                        | 414                                    | application/json                       |
| errors.ErrorDto                        | 400, 401, 403, 404, 405, 409, 413, 415 | application/json                       |
| errors.ValidationErrorDto              | 422                                    | application/json                       |
| errors.ErrorDto                        | 500                                    | application/json                       |
| errors.SDKError                        | 4XX, 5XX                               | \*/\*                                  |