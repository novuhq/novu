# Schema Validation

`@novu/framework` accepts three kinds of schemas for both `payloadSchema` (workflow level) and `controlSchema` (step level):

| Schema | Best for | Type inference |
| --- | --- | --- |
| **Zod** | TypeScript-first projects | Best — automatic via `z.infer` |
| **JSON Schema** | OpenAPI-style projects, advanced features (`oneOf`, `if/then/else`, `$ref`) | Good — requires `as const` |
| **Class Validator** | OOP-style apps, NestJS DTOs | Requires `class-validator-jsonschema` and `reflect-metadata` |

All three are converted to JSON Schema under the hood and pushed to Novu Cloud — so the Dashboard always renders the same UI.

## Zod (Recommended)

Novu supports **Zod v3**.

### Install

```bash
npm install zod
```

### Workflow Payload

```typescript
import { workflow } from "@novu/framework";
import { z } from "zod";

export const commentWorkflow = workflow(
  "comment-on-post",
  async ({ step, payload }) => {
    await step.email("send-email", async () => ({
      subject: `New comment from ${payload.authorName}`,
      body: payload.comment,
    }));
  },
  {
    payloadSchema: z.object({
      postId: z.number(),
      authorName: z.string(),
      comment: z.string().max(200),
    }),
  }
);
```

### Step Controls

```typescript
await step.email("send-email", async (controls) => ({
  subject: controls.subject,
  body: render(<EmailTemplate hideBanner={controls.hideBanner} />),
}), {
  controlSchema: z.object({
    hideBanner: z.boolean().default(false),
    subject: z.string().default("Hi {{subscriber.firstName | capitalize}}"),
    components: z.array(
      z.object({
        type: z.enum(["header", "cta-row", "footer"]),
        content: z.string(),
      })
    ),
  }),
});
```

### What gets rendered in the Dashboard

| Zod feature | Dashboard input |
| --- | --- |
| `z.string()` | Text input |
| `z.string().email()` | Email input with validation |
| `z.string().url()` | URL input |
| `z.string().regex(...)` | Text input with pattern validation |
| `z.string().min/.max` | Length-validated input |
| `z.number()` | Number input |
| `z.boolean()` | Toggle |
| `z.enum([...])` | Dropdown |
| `z.array(...)` | Repeatable section |
| `.default(value)` | Pre-filled value |

> Zod doesn't support custom `title` on fields — the Dashboard label is derived from the property name.

## JSON Schema

Use JSON Schema when you need features Zod doesn't expose: `oneOf`, `if/then/else`, `$ref`, `enumNames`, etc.

### Workflow Payload

```typescript
workflow("comment", handler, {
  payloadSchema: {
    type: "object",
    properties: {
      postId: { type: "number" },
      authorName: { type: "string" },
      comment: { type: "string", maxLength: 200 },
    },
    required: ["postId", "comment"],
    additionalProperties: false,
  } as const, // CRITICAL: required for TS inference
});
```

> Without `as const`, TypeScript infers `string` for `type` instead of the literal `"object"`, and you lose type inference on `payload`.

### Examples

#### Simple object

```json
{
  "type": "object",
  "required": ["firstName", "lastName"],
  "properties": {
    "firstName": { "type": "string", "title": "First name", "default": "Chuck" },
    "lastName": { "type": "string", "title": "Last name" },
    "age": { "type": "integer", "title": "Age" }
  }
}
```

#### Nested array

```json
{
  "type": "object",
  "properties": {
    "tasks": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "title": { "type": "string" },
          "done": { "type": "boolean", "default": false }
        }
      }
    }
  }
}
```

#### `$ref` reuse

```json
{
  "definitions": {
    "address": {
      "type": "object",
      "properties": {
        "street": { "type": "string" },
        "city": { "type": "string" }
      }
    }
  },
  "type": "object",
  "properties": {
    "billing": { "$ref": "#/definitions/address" },
    "shipping": { "$ref": "#/definitions/address" }
  }
}
```

#### `oneOf` discriminated union

```json
{
  "type": "object",
  "oneOf": [
    {
      "properties": { "lorem": { "type": "string" } },
      "required": ["lorem"]
    },
    {
      "properties": { "ipsum": { "type": "string" } },
      "required": ["ipsum"]
    }
  ]
}
```

#### `if/then/else`

```json
{
  "type": "object",
  "properties": {
    "animal": { "enum": ["Cat", "Fish"] }
  },
  "allOf": [
    {
      "if": { "properties": { "animal": { "const": "Cat" } } },
      "then": {
        "properties": { "food": { "enum": ["meat", "grass", "fish"] } },
        "required": ["food"]
      }
    },
    {
      "if": { "properties": { "animal": { "const": "Fish" } } },
      "then": {
        "properties": {
          "food": { "enum": ["insect", "worms"] },
          "water": { "enum": ["lake", "sea"] }
        },
        "required": ["food", "water"]
      }
    }
  ]
}
```

#### Regex validation

```json
{
  "type": "object",
  "properties": {
    "phone": {
      "type": "string",
      "pattern": "^(\\([0-9]{3}\\))?[0-9]{3}-[0-9]{4}$"
    }
  }
}
```

## Class Validator

For OOP-style projects (especially NestJS DTOs).

### Install

```bash
npm install class-validator class-validator-jsonschema reflect-metadata
```

> `class-validator-jsonschema` is required to convert decorators to JSON Schema.
> `reflect-metadata` must be imported once at app entry (`import "reflect-metadata"`).

### Define DTOs

```typescript
import { workflow } from "@novu/framework";
import {
  IsString,
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

class WelcomeComponent {
  @IsString()
  subject!: string;

  @IsString()
  content!: string;
}

class WelcomeControlSchema {
  @IsBoolean()
  hideBanner!: boolean;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  subject?: string;

  @Type(() => WelcomeComponent)
  @ValidateNested({ each: true })
  @IsOptional()
  components?: WelcomeComponent[];
}

class WelcomePayloadSchema {
  @IsString()
  username!: string;
}

export const welcomeWorkflow = workflow(
  "welcome",
  async ({ step, payload }) => {
    await step.email("send-email", async (controls) => ({
      subject: controls.subject ?? `Welcome ${payload.username}`,
      body: "Hello!",
    }), { controlSchema: WelcomeControlSchema });
  },
  { payloadSchema: WelcomePayloadSchema }
);
```

### Caveats

- Class Validator does **not** support default values out of the box — set them in your resolver.
- Class Validator does **not** support custom titles — Dashboard labels come from the property name.
- Nested schemas can have inconsistencies — see [`class-validator-jsonschema`](https://www.npmjs.com/package/class-validator-jsonschema) docs.

## Choosing a Schema

| You want… | Use |
| --- | --- |
| Best DX, type inference, Vercel-style validation | **Zod** |
| Already use NestJS / DTOs | **Class Validator** |
| Need `oneOf`, `$ref`, `if/then/else`, share schemas with API consumers | **JSON Schema** |
| Want only IDE intellisense (no Dashboard schema) | Plain TS interfaces — but you lose Dashboard form generation |

## Other Resources

- [JSON Schema specification](https://json-schema.org/specification)
- [JSON Schema validator playground](https://www.jsonschemavalidator.net/)
- [React JSON Schema Form](https://rjsf-team.github.io/react-jsonschema-form/) — same UI engine Novu uses for the Dashboard
- [Zod docs](https://zod.dev/)
- [class-validator docs](https://github.com/typestack/class-validator)
