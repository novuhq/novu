# Integrations

## Overview

With the help of the Integration Store, you can easily integrate your favorite delivery provider. During the runtime of the API, the Integrations Store is responsible for storing the configurations of all the providers.
<https://docs.novu.co/platform/integrations/overview>

### Available Operations

* [list](#list) - List all integrations
* [create](#create) - Create an integration
* [update](#update) - Update an integration
* [delete](#delete) - Delete an integration
* [integrationsControllerAutoConfigureIntegration](#integrationscontrollerautoconfigureintegration) - Auto-configure an integration for inbound webhooks
* [setAsPrimary](#setasprimary) - Update integration as primary
* [listActive](#listactive) - List active integrations
* [generateChatOAuthUrl](#generatechatoauthurl) - Generate chat OAuth URL

## list

List all the channels integrations created in the organization

### Example Usage

<!-- UsageSnippet language="typescript" operationID="IntegrationsController_listIntegrations" method="get" path="/v1/integrations" -->
```typescript
import { Novu } from "@novu/api";

const novu = new Novu({
  security: {
    secretKey: "YOUR_SECRET_KEY_HERE",
  },
});

async function run() {
  const result = await novu.integrations.list();

  console.log(result);
}

run();
```

### Standalone function

The standalone function version of this method:

```typescript
import { NovuCore } from "@novu/api/core.js";
import { integrationsList } from "@novu/api/funcs/integrationsList.js";

// Use `NovuCore` for best tree-shaking performance.
// You can create one instance of it to use across an application.
const novu = new NovuCore({
  security: {
    secretKey: "YOUR_SECRET_KEY_HERE",
  },
});

async function run() {
  const res = await integrationsList(novu);
  if (res.ok) {
    const { value: result } = res;
    console.log(result);
  } else {
    console.log("integrationsList failed:", res.error);
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
  useIntegrationsList,
  useIntegrationsListSuspense,

  // Utility for prefetching data during server-side rendering and in React
  // Server Components that will be immediately available to client components
  // using the hooks.
  prefetchIntegrationsList,
  
  // Utilities to invalidate the query cache for this query in response to
  // mutations and other user actions.
  invalidateIntegrationsList,
  invalidateAllIntegrationsList,
} from "@novu/api/react-query/integrationsList.js";
```

### Parameters

| Parameter                                                                                                                                                                      | Type                                                                                                                                                                           | Required                                                                                                                                                                       | Description                                                                                                                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `idempotencyKey`                                                                                                                                                               | *string*                                                                                                                                                                       | :heavy_minus_sign:                                                                                                                                                             | A header for idempotency purposes                                                                                                                                              |
| `options`                                                                                                                                                                      | RequestOptions                                                                                                                                                                 | :heavy_minus_sign:                                                                                                                                                             | Used to set various options for making HTTP requests.                                                                                                                          |
| `options.fetchOptions`                                                                                                                                                         | [RequestInit](https://developer.mozilla.org/en-US/docs/Web/API/Request/Request#options)                                                                                        | :heavy_minus_sign:                                                                                                                                                             | Options that are passed to the underlying HTTP request. This can be used to inject extra headers for examples. All `Request` options, except `method` and `body`, are allowed. |
| `options.retries`                                                                                                                                                              | [RetryConfig](../../lib/utils/retryconfig.md)                                                                                                                                  | :heavy_minus_sign:                                                                                                                                                             | Enables retrying HTTP requests under certain failure conditions.                                                                                                               |

### Response

**Promise\<[operations.IntegrationsControllerListIntegrationsResponse](../../models/operations/integrationscontrollerlistintegrationsresponse.md)\>**

### Errors

| Error Type                             | Status Code                            | Content Type                           |
| -------------------------------------- | -------------------------------------- | -------------------------------------- |
| errors.ErrorDto                        | 414                                    | application/json                       |
| errors.ErrorDto                        | 400, 401, 403, 404, 405, 409, 413, 415 | application/json                       |
| errors.ValidationErrorDto              | 422                                    | application/json                       |
| errors.ErrorDto                        | 500                                    | application/json                       |
| errors.SDKError                        | 4XX, 5XX                               | \*/\*                                  |

## create

Create an integration for the current environment the user is based on the API key provided. 
    Each provider supports different credentials, check the provider documentation for more details.

### Example Usage

<!-- UsageSnippet language="typescript" operationID="IntegrationsController_createIntegration" method="post" path="/v1/integrations" -->
```typescript
import { Novu } from "@novu/api";

const novu = new Novu({
  security: {
    secretKey: "YOUR_SECRET_KEY_HERE",
  },
});

async function run() {
  const result = await novu.integrations.create({
    providerId: "<id>",
    channel: "email",
  });

  console.log(result);
}

run();
```

### Standalone function

The standalone function version of this method:

```typescript
import { NovuCore } from "@novu/api/core.js";
import { integrationsCreate } from "@novu/api/funcs/integrationsCreate.js";

// Use `NovuCore` for best tree-shaking performance.
// You can create one instance of it to use across an application.
const novu = new NovuCore({
  security: {
    secretKey: "YOUR_SECRET_KEY_HERE",
  },
});

async function run() {
  const res = await integrationsCreate(novu, {
    providerId: "<id>",
    channel: "email",
  });
  if (res.ok) {
    const { value: result } = res;
    console.log(result);
  } else {
    console.log("integrationsCreate failed:", res.error);
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
  useIntegrationsCreateMutation
} from "@novu/api/react-query/integrationsCreate.js";
```

### Parameters

| Parameter                                                                                                                                                                      | Type                                                                                                                                                                           | Required                                                                                                                                                                       | Description                                                                                                                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `createIntegrationRequestDto`                                                                                                                                                  | [components.CreateIntegrationRequestDto](../../models/components/createintegrationrequestdto.md)                                                                               | :heavy_check_mark:                                                                                                                                                             | N/A                                                                                                                                                                            |
| `idempotencyKey`                                                                                                                                                               | *string*                                                                                                                                                                       | :heavy_minus_sign:                                                                                                                                                             | A header for idempotency purposes                                                                                                                                              |
| `options`                                                                                                                                                                      | RequestOptions                                                                                                                                                                 | :heavy_minus_sign:                                                                                                                                                             | Used to set various options for making HTTP requests.                                                                                                                          |
| `options.fetchOptions`                                                                                                                                                         | [RequestInit](https://developer.mozilla.org/en-US/docs/Web/API/Request/Request#options)                                                                                        | :heavy_minus_sign:                                                                                                                                                             | Options that are passed to the underlying HTTP request. This can be used to inject extra headers for examples. All `Request` options, except `method` and `body`, are allowed. |
| `options.retries`                                                                                                                                                              | [RetryConfig](../../lib/utils/retryconfig.md)                                                                                                                                  | :heavy_minus_sign:                                                                                                                                                             | Enables retrying HTTP requests under certain failure conditions.                                                                                                               |

### Response

**Promise\<[operations.IntegrationsControllerCreateIntegrationResponse](../../models/operations/integrationscontrollercreateintegrationresponse.md)\>**

### Errors

| Error Type                             | Status Code                            | Content Type                           |
| -------------------------------------- | -------------------------------------- | -------------------------------------- |
| errors.ErrorDto                        | 414                                    | application/json                       |
| errors.ErrorDto                        | 400, 401, 403, 404, 405, 409, 413, 415 | application/json                       |
| errors.ValidationErrorDto              | 422                                    | application/json                       |
| errors.ErrorDto                        | 500                                    | application/json                       |
| errors.SDKError                        | 4XX, 5XX                               | \*/\*                                  |

## update

Update an integration by its unique key identifier **integrationId**. 
    Each provider supports different credentials, check the provider documentation for more details.

### Example Usage

<!-- UsageSnippet language="typescript" operationID="IntegrationsController_updateIntegrationById" method="put" path="/v1/integrations/{integrationId}" -->
```typescript
import { Novu } from "@novu/api";

const novu = new Novu({
  security: {
    secretKey: "YOUR_SECRET_KEY_HERE",
  },
});

async function run() {
  const result = await novu.integrations.update({}, "<id>");

  console.log(result);
}

run();
```

### Standalone function

The standalone function version of this method:

```typescript
import { NovuCore } from "@novu/api/core.js";
import { integrationsUpdate } from "@novu/api/funcs/integrationsUpdate.js";

// Use `NovuCore` for best tree-shaking performance.
// You can create one instance of it to use across an application.
const novu = new NovuCore({
  security: {
    secretKey: "YOUR_SECRET_KEY_HERE",
  },
});

async function run() {
  const res = await integrationsUpdate(novu, {}, "<id>");
  if (res.ok) {
    const { value: result } = res;
    console.log(result);
  } else {
    console.log("integrationsUpdate failed:", res.error);
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
  useIntegrationsUpdateMutation
} from "@novu/api/react-query/integrationsUpdate.js";
```

### Parameters

| Parameter                                                                                                                                                                      | Type                                                                                                                                                                           | Required                                                                                                                                                                       | Description                                                                                                                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `integrationId`                                                                                                                                                                | *string*                                                                                                                                                                       | :heavy_check_mark:                                                                                                                                                             | N/A                                                                                                                                                                            |
| `updateIntegrationRequestDto`                                                                                                                                                  | [components.UpdateIntegrationRequestDto](../../models/components/updateintegrationrequestdto.md)                                                                               | :heavy_check_mark:                                                                                                                                                             | N/A                                                                                                                                                                            |
| `idempotencyKey`                                                                                                                                                               | *string*                                                                                                                                                                       | :heavy_minus_sign:                                                                                                                                                             | A header for idempotency purposes                                                                                                                                              |
| `options`                                                                                                                                                                      | RequestOptions                                                                                                                                                                 | :heavy_minus_sign:                                                                                                                                                             | Used to set various options for making HTTP requests.                                                                                                                          |
| `options.fetchOptions`                                                                                                                                                         | [RequestInit](https://developer.mozilla.org/en-US/docs/Web/API/Request/Request#options)                                                                                        | :heavy_minus_sign:                                                                                                                                                             | Options that are passed to the underlying HTTP request. This can be used to inject extra headers for examples. All `Request` options, except `method` and `body`, are allowed. |
| `options.retries`                                                                                                                                                              | [RetryConfig](../../lib/utils/retryconfig.md)                                                                                                                                  | :heavy_minus_sign:                                                                                                                                                             | Enables retrying HTTP requests under certain failure conditions.                                                                                                               |

### Response

**Promise\<[operations.IntegrationsControllerUpdateIntegrationByIdResponse](../../models/operations/integrationscontrollerupdateintegrationbyidresponse.md)\>**

### Errors

| Error Type                        | Status Code                       | Content Type                      |
| --------------------------------- | --------------------------------- | --------------------------------- |
| errors.ErrorDto                   | 414                               | application/json                  |
| errors.ErrorDto                   | 400, 401, 403, 405, 409, 413, 415 | application/json                  |
| errors.ValidationErrorDto         | 422                               | application/json                  |
| errors.ErrorDto                   | 500                               | application/json                  |
| errors.SDKError                   | 4XX, 5XX                          | \*/\*                             |

## delete

Delete an integration by its unique key identifier **integrationId**. 
    This action is irreversible.

### Example Usage

<!-- UsageSnippet language="typescript" operationID="IntegrationsController_removeIntegration" method="delete" path="/v1/integrations/{integrationId}" -->
```typescript
import { Novu } from "@novu/api";

const novu = new Novu({
  security: {
    secretKey: "YOUR_SECRET_KEY_HERE",
  },
});

async function run() {
  const result = await novu.integrations.delete("<id>");

  console.log(result);
}

run();
```

### Standalone function

The standalone function version of this method:

```typescript
import { NovuCore } from "@novu/api/core.js";
import { integrationsDelete } from "@novu/api/funcs/integrationsDelete.js";

// Use `NovuCore` for best tree-shaking performance.
// You can create one instance of it to use across an application.
const novu = new NovuCore({
  security: {
    secretKey: "YOUR_SECRET_KEY_HERE",
  },
});

async function run() {
  const res = await integrationsDelete(novu, "<id>");
  if (res.ok) {
    const { value: result } = res;
    console.log(result);
  } else {
    console.log("integrationsDelete failed:", res.error);
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
  useIntegrationsDeleteMutation
} from "@novu/api/react-query/integrationsDelete.js";
```

### Parameters

| Parameter                                                                                                                                                                      | Type                                                                                                                                                                           | Required                                                                                                                                                                       | Description                                                                                                                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `integrationId`                                                                                                                                                                | *string*                                                                                                                                                                       | :heavy_check_mark:                                                                                                                                                             | N/A                                                                                                                                                                            |
| `idempotencyKey`                                                                                                                                                               | *string*                                                                                                                                                                       | :heavy_minus_sign:                                                                                                                                                             | A header for idempotency purposes                                                                                                                                              |
| `options`                                                                                                                                                                      | RequestOptions                                                                                                                                                                 | :heavy_minus_sign:                                                                                                                                                             | Used to set various options for making HTTP requests.                                                                                                                          |
| `options.fetchOptions`                                                                                                                                                         | [RequestInit](https://developer.mozilla.org/en-US/docs/Web/API/Request/Request#options)                                                                                        | :heavy_minus_sign:                                                                                                                                                             | Options that are passed to the underlying HTTP request. This can be used to inject extra headers for examples. All `Request` options, except `method` and `body`, are allowed. |
| `options.retries`                                                                                                                                                              | [RetryConfig](../../lib/utils/retryconfig.md)                                                                                                                                  | :heavy_minus_sign:                                                                                                                                                             | Enables retrying HTTP requests under certain failure conditions.                                                                                                               |

### Response

**Promise\<[operations.IntegrationsControllerRemoveIntegrationResponse](../../models/operations/integrationscontrollerremoveintegrationresponse.md)\>**

### Errors

| Error Type                             | Status Code                            | Content Type                           |
| -------------------------------------- | -------------------------------------- | -------------------------------------- |
| errors.ErrorDto                        | 414                                    | application/json                       |
| errors.ErrorDto                        | 400, 401, 403, 404, 405, 409, 413, 415 | application/json                       |
| errors.ValidationErrorDto              | 422                                    | application/json                       |
| errors.ErrorDto                        | 500                                    | application/json                       |
| errors.SDKError                        | 4XX, 5XX                               | \*/\*                                  |

## integrationsControllerAutoConfigureIntegration

Auto-configure an integration by its unique key identifier **integrationId** for inbound webhook support. 
    This will automatically generate required webhook signing keys and configure webhook endpoints.

### Example Usage

<!-- UsageSnippet language="typescript" operationID="IntegrationsController_autoConfigureIntegration" method="post" path="/v1/integrations/{integrationId}/auto-configure" -->
```typescript
import { Novu } from "@novu/api";

const novu = new Novu({
  security: {
    secretKey: "YOUR_SECRET_KEY_HERE",
  },
});

async function run() {
  const result = await novu.integrations.integrationsControllerAutoConfigureIntegration("<id>");

  console.log(result);
}

run();
```

### Standalone function

The standalone function version of this method:

```typescript
import { NovuCore } from "@novu/api/core.js";
import { integrationsIntegrationsControllerAutoConfigureIntegration } from "@novu/api/funcs/integrationsIntegrationsControllerAutoConfigureIntegration.js";

// Use `NovuCore` for best tree-shaking performance.
// You can create one instance of it to use across an application.
const novu = new NovuCore({
  security: {
    secretKey: "YOUR_SECRET_KEY_HERE",
  },
});

async function run() {
  const res = await integrationsIntegrationsControllerAutoConfigureIntegration(novu, "<id>");
  if (res.ok) {
    const { value: result } = res;
    console.log(result);
  } else {
    console.log("integrationsIntegrationsControllerAutoConfigureIntegration failed:", res.error);
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
  useIntegrationsIntegrationsControllerAutoConfigureIntegrationMutation
} from "@novu/api/react-query/integrationsIntegrationsControllerAutoConfigureIntegration.js";
```

### Parameters

| Parameter                                                                                                                                                                      | Type                                                                                                                                                                           | Required                                                                                                                                                                       | Description                                                                                                                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `integrationId`                                                                                                                                                                | *string*                                                                                                                                                                       | :heavy_check_mark:                                                                                                                                                             | N/A                                                                                                                                                                            |
| `idempotencyKey`                                                                                                                                                               | *string*                                                                                                                                                                       | :heavy_minus_sign:                                                                                                                                                             | A header for idempotency purposes                                                                                                                                              |
| `options`                                                                                                                                                                      | RequestOptions                                                                                                                                                                 | :heavy_minus_sign:                                                                                                                                                             | Used to set various options for making HTTP requests.                                                                                                                          |
| `options.fetchOptions`                                                                                                                                                         | [RequestInit](https://developer.mozilla.org/en-US/docs/Web/API/Request/Request#options)                                                                                        | :heavy_minus_sign:                                                                                                                                                             | Options that are passed to the underlying HTTP request. This can be used to inject extra headers for examples. All `Request` options, except `method` and `body`, are allowed. |
| `options.retries`                                                                                                                                                              | [RetryConfig](../../lib/utils/retryconfig.md)                                                                                                                                  | :heavy_minus_sign:                                                                                                                                                             | Enables retrying HTTP requests under certain failure conditions.                                                                                                               |

### Response

**Promise\<[operations.IntegrationsControllerAutoConfigureIntegrationResponse](../../models/operations/integrationscontrollerautoconfigureintegrationresponse.md)\>**

### Errors

| Error Type                        | Status Code                       | Content Type                      |
| --------------------------------- | --------------------------------- | --------------------------------- |
| errors.ErrorDto                   | 414                               | application/json                  |
| errors.ErrorDto                   | 400, 401, 403, 405, 409, 413, 415 | application/json                  |
| errors.ValidationErrorDto         | 422                               | application/json                  |
| errors.ErrorDto                   | 500                               | application/json                  |
| errors.SDKError                   | 4XX, 5XX                          | \*/\*                             |

## setAsPrimary

Update an integration as **primary** by its unique key identifier **integrationId**. 
    This API will set the integration as primary for that channel in the current environment. 
    Primary integration is used to deliver notification for sms and email channels in the workflow.

### Example Usage

<!-- UsageSnippet language="typescript" operationID="IntegrationsController_setIntegrationAsPrimary" method="post" path="/v1/integrations/{integrationId}/set-primary" -->
```typescript
import { Novu } from "@novu/api";

const novu = new Novu({
  security: {
    secretKey: "YOUR_SECRET_KEY_HERE",
  },
});

async function run() {
  const result = await novu.integrations.setAsPrimary("<id>");

  console.log(result);
}

run();
```

### Standalone function

The standalone function version of this method:

```typescript
import { NovuCore } from "@novu/api/core.js";
import { integrationsSetAsPrimary } from "@novu/api/funcs/integrationsSetAsPrimary.js";

// Use `NovuCore` for best tree-shaking performance.
// You can create one instance of it to use across an application.
const novu = new NovuCore({
  security: {
    secretKey: "YOUR_SECRET_KEY_HERE",
  },
});

async function run() {
  const res = await integrationsSetAsPrimary(novu, "<id>");
  if (res.ok) {
    const { value: result } = res;
    console.log(result);
  } else {
    console.log("integrationsSetAsPrimary failed:", res.error);
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
  useIntegrationsSetAsPrimaryMutation
} from "@novu/api/react-query/integrationsSetAsPrimary.js";
```

### Parameters

| Parameter                                                                                                                                                                      | Type                                                                                                                                                                           | Required                                                                                                                                                                       | Description                                                                                                                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `integrationId`                                                                                                                                                                | *string*                                                                                                                                                                       | :heavy_check_mark:                                                                                                                                                             | N/A                                                                                                                                                                            |
| `idempotencyKey`                                                                                                                                                               | *string*                                                                                                                                                                       | :heavy_minus_sign:                                                                                                                                                             | A header for idempotency purposes                                                                                                                                              |
| `options`                                                                                                                                                                      | RequestOptions                                                                                                                                                                 | :heavy_minus_sign:                                                                                                                                                             | Used to set various options for making HTTP requests.                                                                                                                          |
| `options.fetchOptions`                                                                                                                                                         | [RequestInit](https://developer.mozilla.org/en-US/docs/Web/API/Request/Request#options)                                                                                        | :heavy_minus_sign:                                                                                                                                                             | Options that are passed to the underlying HTTP request. This can be used to inject extra headers for examples. All `Request` options, except `method` and `body`, are allowed. |
| `options.retries`                                                                                                                                                              | [RetryConfig](../../lib/utils/retryconfig.md)                                                                                                                                  | :heavy_minus_sign:                                                                                                                                                             | Enables retrying HTTP requests under certain failure conditions.                                                                                                               |

### Response

**Promise\<[operations.IntegrationsControllerSetIntegrationAsPrimaryResponse](../../models/operations/integrationscontrollersetintegrationasprimaryresponse.md)\>**

### Errors

| Error Type                        | Status Code                       | Content Type                      |
| --------------------------------- | --------------------------------- | --------------------------------- |
| errors.ErrorDto                   | 414                               | application/json                  |
| errors.ErrorDto                   | 400, 401, 403, 405, 409, 413, 415 | application/json                  |
| errors.ValidationErrorDto         | 422                               | application/json                  |
| errors.ErrorDto                   | 500                               | application/json                  |
| errors.SDKError                   | 4XX, 5XX                          | \*/\*                             |

## listActive

List all the active integrations created in the organization

### Example Usage

<!-- UsageSnippet language="typescript" operationID="IntegrationsController_getActiveIntegrations" method="get" path="/v1/integrations/active" -->
```typescript
import { Novu } from "@novu/api";

const novu = new Novu({
  security: {
    secretKey: "YOUR_SECRET_KEY_HERE",
  },
});

async function run() {
  const result = await novu.integrations.listActive();

  console.log(result);
}

run();
```

### Standalone function

The standalone function version of this method:

```typescript
import { NovuCore } from "@novu/api/core.js";
import { integrationsListActive } from "@novu/api/funcs/integrationsListActive.js";

// Use `NovuCore` for best tree-shaking performance.
// You can create one instance of it to use across an application.
const novu = new NovuCore({
  security: {
    secretKey: "YOUR_SECRET_KEY_HERE",
  },
});

async function run() {
  const res = await integrationsListActive(novu);
  if (res.ok) {
    const { value: result } = res;
    console.log(result);
  } else {
    console.log("integrationsListActive failed:", res.error);
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
  useIntegrationsListActive,
  useIntegrationsListActiveSuspense,

  // Utility for prefetching data during server-side rendering and in React
  // Server Components that will be immediately available to client components
  // using the hooks.
  prefetchIntegrationsListActive,
  
  // Utilities to invalidate the query cache for this query in response to
  // mutations and other user actions.
  invalidateIntegrationsListActive,
  invalidateAllIntegrationsListActive,
} from "@novu/api/react-query/integrationsListActive.js";
```

### Parameters

| Parameter                                                                                                                                                                      | Type                                                                                                                                                                           | Required                                                                                                                                                                       | Description                                                                                                                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `idempotencyKey`                                                                                                                                                               | *string*                                                                                                                                                                       | :heavy_minus_sign:                                                                                                                                                             | A header for idempotency purposes                                                                                                                                              |
| `options`                                                                                                                                                                      | RequestOptions                                                                                                                                                                 | :heavy_minus_sign:                                                                                                                                                             | Used to set various options for making HTTP requests.                                                                                                                          |
| `options.fetchOptions`                                                                                                                                                         | [RequestInit](https://developer.mozilla.org/en-US/docs/Web/API/Request/Request#options)                                                                                        | :heavy_minus_sign:                                                                                                                                                             | Options that are passed to the underlying HTTP request. This can be used to inject extra headers for examples. All `Request` options, except `method` and `body`, are allowed. |
| `options.retries`                                                                                                                                                              | [RetryConfig](../../lib/utils/retryconfig.md)                                                                                                                                  | :heavy_minus_sign:                                                                                                                                                             | Enables retrying HTTP requests under certain failure conditions.                                                                                                               |

### Response

**Promise\<[operations.IntegrationsControllerGetActiveIntegrationsResponse](../../models/operations/integrationscontrollergetactiveintegrationsresponse.md)\>**

### Errors

| Error Type                             | Status Code                            | Content Type                           |
| -------------------------------------- | -------------------------------------- | -------------------------------------- |
| errors.ErrorDto                        | 414                                    | application/json                       |
| errors.ErrorDto                        | 400, 401, 403, 404, 405, 409, 413, 415 | application/json                       |
| errors.ValidationErrorDto              | 422                                    | application/json                       |
| errors.ErrorDto                        | 500                                    | application/json                       |
| errors.SDKError                        | 4XX, 5XX                               | \*/\*                                  |

## generateChatOAuthUrl

Generate an OAuth URL for chat integrations like Slack and MS Teams. 
    This URL allows subscribers to authorize the integration, enabling the system to send messages 
    through their chat workspace. The generated URL expires after 5 minutes.

### Example Usage

<!-- UsageSnippet language="typescript" operationID="IntegrationsController_getChatOAuthUrl" method="post" path="/v1/integrations/chat/oauth" -->
```typescript
import { Novu } from "@novu/api";

const novu = new Novu({
  security: {
    secretKey: "YOUR_SECRET_KEY_HERE",
  },
});

async function run() {
  const result = await novu.integrations.generateChatOAuthUrl({
    subscriberId: "subscriber-123",
    integrationIdentifier: "<value>",
    connectionIdentifier: "slack-connection-abc123",
    context: {
      "key": "org-acme",
    },
    scope: [
      "chat:write",
      "chat:write.public",
      "channels:read",
      "groups:read",
      "users:read",
      "users:read.email",
      "incoming-webhook",
    ],
  });

  console.log(result);
}

run();
```

### Standalone function

The standalone function version of this method:

```typescript
import { NovuCore } from "@novu/api/core.js";
import { integrationsGenerateChatOAuthUrl } from "@novu/api/funcs/integrationsGenerateChatOAuthUrl.js";

// Use `NovuCore` for best tree-shaking performance.
// You can create one instance of it to use across an application.
const novu = new NovuCore({
  security: {
    secretKey: "YOUR_SECRET_KEY_HERE",
  },
});

async function run() {
  const res = await integrationsGenerateChatOAuthUrl(novu, {
    subscriberId: "subscriber-123",
    integrationIdentifier: "<value>",
    connectionIdentifier: "slack-connection-abc123",
    context: {
      "key": "org-acme",
    },
    scope: [
      "chat:write",
      "chat:write.public",
      "channels:read",
      "groups:read",
      "users:read",
      "users:read.email",
      "incoming-webhook",
    ],
  });
  if (res.ok) {
    const { value: result } = res;
    console.log(result);
  } else {
    console.log("integrationsGenerateChatOAuthUrl failed:", res.error);
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
  useIntegrationsGenerateChatOAuthUrlMutation
} from "@novu/api/react-query/integrationsGenerateChatOAuthUrl.js";
```

### Parameters

| Parameter                                                                                                                                                                      | Type                                                                                                                                                                           | Required                                                                                                                                                                       | Description                                                                                                                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `generateChatOauthUrlRequestDto`                                                                                                                                               | [components.GenerateChatOauthUrlRequestDto](../../models/components/generatechatoauthurlrequestdto.md)                                                                         | :heavy_check_mark:                                                                                                                                                             | N/A                                                                                                                                                                            |
| `idempotencyKey`                                                                                                                                                               | *string*                                                                                                                                                                       | :heavy_minus_sign:                                                                                                                                                             | A header for idempotency purposes                                                                                                                                              |
| `options`                                                                                                                                                                      | RequestOptions                                                                                                                                                                 | :heavy_minus_sign:                                                                                                                                                             | Used to set various options for making HTTP requests.                                                                                                                          |
| `options.fetchOptions`                                                                                                                                                         | [RequestInit](https://developer.mozilla.org/en-US/docs/Web/API/Request/Request#options)                                                                                        | :heavy_minus_sign:                                                                                                                                                             | Options that are passed to the underlying HTTP request. This can be used to inject extra headers for examples. All `Request` options, except `method` and `body`, are allowed. |
| `options.retries`                                                                                                                                                              | [RetryConfig](../../lib/utils/retryconfig.md)                                                                                                                                  | :heavy_minus_sign:                                                                                                                                                             | Enables retrying HTTP requests under certain failure conditions.                                                                                                               |

### Response

**Promise\<[operations.IntegrationsControllerGetChatOAuthUrlResponse](../../models/operations/integrationscontrollergetchatoauthurlresponse.md)\>**

### Errors

| Error Type                             | Status Code                            | Content Type                           |
| -------------------------------------- | -------------------------------------- | -------------------------------------- |
| errors.ErrorDto                        | 414                                    | application/json                       |
| errors.ErrorDto                        | 400, 401, 403, 404, 405, 409, 413, 415 | application/json                       |
| errors.ValidationErrorDto              | 422                                    | application/json                       |
| errors.ErrorDto                        | 500                                    | application/json                       |
| errors.SDKError                        | 4XX, 5XX                               | \*/\*                                  |