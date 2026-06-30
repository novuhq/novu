# Installation

Novu maintains official server-side SDKs for TypeScript/Node.js, Python, Go, PHP, .NET, and Java. See https://docs.novu.co/platform/sdks#server-side-sdks for full reference pages.

## Node.js / TypeScript

```bash
npm install @novu/api
# or
pnpm add @novu/api
# or
yarn add @novu/api
```

```typescript
import { Novu } from "@novu/api";

const novu = new Novu({
  secretKey: process.env.NOVU_SECRET_KEY,
});
```

## Python

```bash
pip install novu-py
```

```python
import os
from novu_py import Novu

with Novu(secret_key=os.environ["NOVU_SECRET_KEY"]) as novu:
    ...
```

## Go

```bash
go get github.com/novuhq/novu-go
```

```go
import (
    novugo "github.com/novuhq/novu-go"
    "os"
)

s := novugo.New(novugo.WithSecurity(os.Getenv("NOVU_SECRET_KEY")))
```

## PHP

```bash
composer require "novuhq/novu"
```

```php
use novu;

$sdk = novu\Novu::builder()
    ->setSecurity(getenv('NOVU_SECRET_KEY'))
    ->build();
```

## .NET

```bash
dotnet add package Novu
```

```csharp
using Novu;

var sdk = new NovuSDK(secretKey: Environment.GetEnvironmentVariable("NOVU_SECRET_KEY"));
```

## Java

Maven:

```xml
<dependency>
    <groupId>co.novu</groupId>
    <artifactId>novu-java</artifactId>
    <version>LATEST</version>
</dependency>
```

```java
import co.novu.Novu;

Novu novu = Novu.builder()
    .secretKey(System.getenv("NOVU_SECRET_KEY"))
    .build();
```

## Environment Variables

```bash
NOVU_SECRET_KEY=your-secret-key-here
```

Get your API key from [dashboard.novu.co/api-keys](https://dashboard.novu.co/api-keys).

## cURL

All API requests require the `Authorization` header:

```bash
curl -X POST https://api.novu.co/v1/events/trigger \
  -H "Authorization: ApiKey YOUR_SECRET_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "workflow-id",
    "to": "subscriber-id",
    "payload": {}
  }'
```

**Note:** In the REST API, the trigger field is called `name` (not `workflowId`). SDKs map `workflowId` to `name` automatically.
