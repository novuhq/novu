# Email Step

Email step for detailed content, formal communications, receipts.

## Schema Requirements (choose one `editorType`)

### Option 1: Block Editor Format (recommended for simple email layouts)

Required properties: `subject`, `editorType`, `body`.

| Field        | Value                                                          |
| ------------ | -------------------------------------------------------------- |
| `subject`    | `string` — email subject line                                  |
| `editorType` | `"block"`                                                      |
| `body`       | `object` — email body in Maily TipTap JSON format              |

### Option 2: HTML Format (recommended for complex email layouts)

Required properties: `subject`, `editorType`, `body`.

| Field        | Value                                                                                                                                       |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `subject`    | `string` — email subject line                                                                                                               |
| `editorType` | `"html"`                                                                                                                                    |
| `body`       | `string` — email body always in HTML format. Use semantic HTML with inline styles. Structure with headings, paragraphs, and styled buttons. |

## Email Content Requirements

- Subject lines should be compelling and **under 60 characters**.
- Keep paragraphs short and scannable.
- Include clear call-to-action buttons when necessary.

## HTML Format Requirements

- `body` must be valid HTML with **inline styles** for email client compatibility.
- Use semantic HTML: `<h1>`, `<h2>`, `<p>`, `<a>`, `<table>` for layout.
- Add inline styles for colors, spacing, fonts (e.g. `style="color: #333; margin: 16px 0;"`).
- Make sure that the content has enough whitespace between the elements and around the content to be readable.
- Use **tables for layout** to ensure compatibility across email clients. Avoid flexbox or grid; apply inline styles to table cells only when needed for spacing or typography.
- Include variables using Liquid syntax: `{{ subscriber.firstName }}`, `{{ payload.variableName }}`.
- **Full LiquidJS syntax** (loops, conditionals, filters) is only supported in the HTML editor.
- When the payload or available variables contain an array (e.g. `payload.items`, `payload.providers`), use a LiquidJS `{% for %}` loop to iterate over it. Never hardcode or list individual array items as separate HTML elements.

```liquid
{% for item in payload.items %}<p>{{ item.name }}</p>{% endfor %}
```

### Example button (HTML format only)

```html
<a href="{{ payload.actionUrl }}" style="display: inline-block; padding: 12px 24px; background-color: #007bff; color: #ffffff; text-decoration: none; border-radius: 4px; font-weight: 600;">Click Here</a>
```

## Block Editor Format Guideline

1. Use `heading` nodes for titles (level 1 for main, level 2 for sections).
2. Use `text` node for body text.
3. Use `spacer` nodes between sections (`height: 16` or `24`).
4. Use `button` nodes for CTAs with good contrast colors.

### Block Editor nodes must follow these requirements

1. Maily TipTap JSON format with proper node structure is required.
2. **Variable names in node attributes must NEVER use curly braces `{{` and `}}`.** This applies to ALL attributes across ALL node types (`url`, `text`, `src`, `id`, `each`, `href`, `externalLink`, etc.).
   - Always use the bare variable name directly, without any templating syntax.
   - Correct: `"payload.actionUrl"`
   - Wrong: `"{{ payload.actionUrl }}"`
3. **Text variables** should be defined using `variable` nodes with an `id` attribute like `"id": "subscriber.firstName"` or `"id": "payload.variableName"`. The `aliasFor` attribute is optional and should be used **only** when the variable is accessed inside a `repeat` node.
4. The **`repeat` node** must always have the `each` attribute, for example `"each": "payload.items"`.

   To access the items in the array, you must use the `variable` node with:
   - `id` attribute (required)
   - `aliasFor` attribute (required)

   Rules for the `variable` node **only** when used inside a `repeat` node:
   - The `id` attribute must use the special prefix `current.`, for example `"id": "current.variableName"`.
   - The `aliasFor` attribute must consist of: `<each value>` + `.` + `<variable name>`, for example `"aliasFor": "payload.items.variableName"`.
   - Never use any other prefix than `current.` in the `variable` node `id` attribute when accessing array items.
   - Example:

     ```json
     { "type": "variable", "attrs": { "id": "current.variableName", "aliasFor": "payload.items.variableName" } }
     ```

   When the payload or available variables contain an array (e.g. `payload.items`, `payload.providers`), always use a `repeat` node to iterate over it. Never hardcode or list individual array items as separate nodes.

   Never use the `current.*` variable outside of the `repeat` node.

5. **`button` nodes:** when `url` or `text` holds a variable, use the bare variable name and set the corresponding boolean flag.
   - Correct: `{ "type": "button", "attrs": { "url": "payload.actionUrl", "isUrlVariable": true } }`
   - Wrong: `{ "type": "button", "attrs": { "url": "{{ payload.actionUrl }}", "isUrlVariable": true } }`
   - Correct: `{ "type": "button", "attrs": { "text": "payload.label", "isTextVariable": true } }`
6. **`image` nodes:** same rule — bare variable name in `src` or `externalLink` with the matching boolean flag.
   - Correct: `{ "type": "image", "attrs": { "src": "payload.imageUrl", "isSrcVariable": true } }`
   - Wrong: `{ "type": "image", "attrs": { "src": "{{ payload.imageUrl }}", "isSrcVariable": true } }`
7. **`inlineImage` nodes:** same rule for `src` with `isSrcVariable` and `externalLink` with `isExternalLinkVariable`.
   - Correct: `{ "type": "inlineImage", "attrs": { "src": "payload.imageUrl", "isSrcVariable": true } }`
   - Correct: `{ "type": "inlineImage", "attrs": { "externalLink": "payload.imageUrl", "isExternalLinkVariable": true } }`

### Digest Step Special Variables

1. **`steps.<digest-step-id>.events`**
   - Available **only** for steps that come **after** a digest step.
   - The variable name is dynamic and depends on the digest step ID, for example:
     - `steps.digest-step.events`
     - `steps.digest-step-2.events`
   - It must be used with the `repeat` node only to iterate over the digested events payload.
   - To access the digested events `payload` data, use the `variable` node with attributes:
     - `id` attribute (required):
       - Must start with the `current.payload` prefix.
       - Format: `"current.payload.<variableName>"`. Example: `"id": "current.payload.variableName"`.
       - Never use any prefix other than `current.payload` in the `variable` node `id` attribute when accessing digested events.
     - `aliasFor` attribute (required):
       - Format: `"aliasFor": "steps.<digest-step-id>.events.payload.<variableName>"`.
       - Example: `"aliasFor": "steps.digest-step.events.payload.variableName"`.
     - Example:

       ```json
       { "type": "variable", "attrs": { "id": "current.payload.variableName", "aliasFor": "steps.digest-step.events.payload.variableName" } }
       ```

2. **`steps.<digest-step-id>.eventCount`**
   - Available **only** for steps that come **after** a digest step.
   - The variable name is dynamic and depends on the digest step ID, for example:
     - `steps.digest-step.eventCount`
     - `steps.digest-step-2.eventCount`
   - Used to access the **number of digested events**.

### HTTP Request Step Response Variables

Available **only** for steps that come **after** an HTTP Request step that defines a `responseBodySchema`. Each property from the schema becomes a variable at `steps.<http-step-id>.<property>`.

- **Block Editor:** create a `variable` node:
  - `id`: `"steps.<http-step-id>.<property>"`
  - Example: `{ "type": "variable", "attrs": { "id": "steps.fetch-user.name" } }`
- **HTML format:** use Liquid syntax: `{{ steps.fetch-user.name }}`.

> Only properties declared in the HTTP step's `responseBodySchema` are available — do not reference arbitrary response fields.

## See Also

- [`http-request-step.md`](./http-request-step.md) — declare `responseBodySchema` so an email step can read response data
- [`digest-step.md`](./digest-step.md) — when an email step is preceded by a digest, use the special variables above
- [`step-conditions.md`](./step-conditions.md) — gate the email on subscriber state or previous step results
