# Translations.Groups

## Overview

### Available Operations

* [delete](#delete) - Delete a translation group
* [retrieve](#retrieve) - Retrieve a translation group

## delete

Delete an entire translation group and all its translations

### Example Usage

<!-- UsageSnippet language="typescript" operationID="TranslationController_deleteTranslationGroupEndpoint" method="delete" path="/v2/translations/{resourceType}/{resourceId}" -->
```typescript
import { Novu } from "@novu/api";

const novu = new Novu({
  security: {
    secretKey: "YOUR_SECRET_KEY_HERE",
  },
});

async function run() {
  await novu.translations.groups.delete("workflow", "welcome-email");


}

run();
```

### Standalone function

The standalone function version of this method:

```typescript
import { NovuCore } from "@novu/api/core.js";
import { translationsGroupsDelete } from "@novu/api/funcs/translationsGroupsDelete.js";

// Use `NovuCore` for best tree-shaking performance.
// You can create one instance of it to use across an application.
const novu = new NovuCore({
  security: {
    secretKey: "YOUR_SECRET_KEY_HERE",
  },
});

async function run() {
  const res = await translationsGroupsDelete(novu, "workflow", "welcome-email");
  if (res.ok) {
    const { value: result } = res;
    
  } else {
    console.log("translationsGroupsDelete failed:", res.error);
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
  useTranslationsGroupsDeleteMutation
} from "@novu/api/react-query/translationsGroupsDelete.js";
```

### Parameters

| Parameter                                                                                                                                                                                  | Type                                                                                                                                                                                       | Required                                                                                                                                                                                   | Description                                                                                                                                                                                | Example                                                                                                                                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `resourceType`                                                                                                                                                                             | [operations.TranslationControllerDeleteTranslationGroupEndpointPathParamResourceType](../../models/operations/translationcontrollerdeletetranslationgroupendpointpathparamresourcetype.md) | :heavy_check_mark:                                                                                                                                                                         | Resource type                                                                                                                                                                              | [object Object]                                                                                                                                                                            |
| `resourceId`                                                                                                                                                                               | *string*                                                                                                                                                                                   | :heavy_check_mark:                                                                                                                                                                         | Resource ID                                                                                                                                                                                | [object Object]                                                                                                                                                                            |
| `idempotencyKey`                                                                                                                                                                           | *string*                                                                                                                                                                                   | :heavy_minus_sign:                                                                                                                                                                         | A header for idempotency purposes                                                                                                                                                          |                                                                                                                                                                                            |
| `options`                                                                                                                                                                                  | RequestOptions                                                                                                                                                                             | :heavy_minus_sign:                                                                                                                                                                         | Used to set various options for making HTTP requests.                                                                                                                                      |                                                                                                                                                                                            |
| `options.fetchOptions`                                                                                                                                                                     | [RequestInit](https://developer.mozilla.org/en-US/docs/Web/API/Request/Request#options)                                                                                                    | :heavy_minus_sign:                                                                                                                                                                         | Options that are passed to the underlying HTTP request. This can be used to inject extra headers for examples. All `Request` options, except `method` and `body`, are allowed.             |                                                                                                                                                                                            |
| `options.retries`                                                                                                                                                                          | [RetryConfig](../../lib/utils/retryconfig.md)                                                                                                                                              | :heavy_minus_sign:                                                                                                                                                                         | Enables retrying HTTP requests under certain failure conditions.                                                                                                                           |                                                                                                                                                                                            |

### Response

**Promise\<void\>**

### Errors

| Error Type      | Status Code     | Content Type    |
| --------------- | --------------- | --------------- |
| errors.SDKError | 4XX, 5XX        | \*/\*           |

## retrieve

Retrieves a single translation group by resource type (workflow, layout) and resource ID (workflowId, layoutId)

### Example Usage

<!-- UsageSnippet language="typescript" operationID="TranslationController_getTranslationGroupEndpoint" method="get" path="/v2/translations/group/{resourceType}/{resourceId}" -->
```typescript
import { Novu } from "@novu/api";

const novu = new Novu({
  security: {
    secretKey: "YOUR_SECRET_KEY_HERE",
  },
});

async function run() {
  const result = await novu.translations.groups.retrieve("workflow", "welcome-email");

  console.log(result);
}

run();
```

### Standalone function

The standalone function version of this method:

```typescript
import { NovuCore } from "@novu/api/core.js";
import { translationsGroupsRetrieve } from "@novu/api/funcs/translationsGroupsRetrieve.js";

// Use `NovuCore` for best tree-shaking performance.
// You can create one instance of it to use across an application.
const novu = new NovuCore({
  security: {
    secretKey: "YOUR_SECRET_KEY_HERE",
  },
});

async function run() {
  const res = await translationsGroupsRetrieve(novu, "workflow", "welcome-email");
  if (res.ok) {
    const { value: result } = res;
    console.log(result);
  } else {
    console.log("translationsGroupsRetrieve failed:", res.error);
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
  useTranslationsGroupsRetrieve,
  useTranslationsGroupsRetrieveSuspense,

  // Utility for prefetching data during server-side rendering and in React
  // Server Components that will be immediately available to client components
  // using the hooks.
  prefetchTranslationsGroupsRetrieve,
  
  // Utilities to invalidate the query cache for this query in response to
  // mutations and other user actions.
  invalidateTranslationsGroupsRetrieve,
  invalidateAllTranslationsGroupsRetrieve,
} from "@novu/api/react-query/translationsGroupsRetrieve.js";
```

### Parameters

| Parameter                                                                                                                                                                            | Type                                                                                                                                                                                 | Required                                                                                                                                                                             | Description                                                                                                                                                                          | Example                                                                                                                                                                              |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `resourceType`                                                                                                                                                                       | [operations.TranslationControllerGetTranslationGroupEndpointPathParamResourceType](../../models/operations/translationcontrollergettranslationgroupendpointpathparamresourcetype.md) | :heavy_check_mark:                                                                                                                                                                   | Resource type                                                                                                                                                                        | [object Object]                                                                                                                                                                      |
| `resourceId`                                                                                                                                                                         | *string*                                                                                                                                                                             | :heavy_check_mark:                                                                                                                                                                   | Resource ID                                                                                                                                                                          | [object Object]                                                                                                                                                                      |
| `idempotencyKey`                                                                                                                                                                     | *string*                                                                                                                                                                             | :heavy_minus_sign:                                                                                                                                                                   | A header for idempotency purposes                                                                                                                                                    |                                                                                                                                                                                      |
| `options`                                                                                                                                                                            | RequestOptions                                                                                                                                                                       | :heavy_minus_sign:                                                                                                                                                                   | Used to set various options for making HTTP requests.                                                                                                                                |                                                                                                                                                                                      |
| `options.fetchOptions`                                                                                                                                                               | [RequestInit](https://developer.mozilla.org/en-US/docs/Web/API/Request/Request#options)                                                                                              | :heavy_minus_sign:                                                                                                                                                                   | Options that are passed to the underlying HTTP request. This can be used to inject extra headers for examples. All `Request` options, except `method` and `body`, are allowed.       |                                                                                                                                                                                      |
| `options.retries`                                                                                                                                                                    | [RetryConfig](../../lib/utils/retryconfig.md)                                                                                                                                        | :heavy_minus_sign:                                                                                                                                                                   | Enables retrying HTTP requests under certain failure conditions.                                                                                                                     |                                                                                                                                                                                      |

### Response

**Promise\<[components.TranslationGroupDto](../../models/components/translationgroupdto.md)\>**

### Errors

| Error Type      | Status Code     | Content Type    |
| --------------- | --------------- | --------------- |
| errors.SDKError | 4XX, 5XX        | \*/\*           |