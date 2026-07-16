# Reference: per-file patterns from the PagerDuty implementation

All snippets are distilled from the live `pagerduty_service` code. Substitute
your endpoint type / secret fields. Read the actual PagerDuty files alongside
this — they are the source of truth.

## 1. Shared types (`packages/shared/src/types/channel-endpoint.ts`)

```typescript
export const ENDPOINT_TYPES = {
  // ...
  PAGERDUTY_SERVICE: 'pagerduty_service',
} as const;

export type ChannelEndpointByType = {
  // ...
  /**
   * At the API boundary this is the wire shape on both writes and reads.
   * Internally the secret is persisted encrypted on the linked
   * ChannelConnection.auth and the stored ChannelEndpoint.endpoint is empty;
   * the read path re-hydrates this shape from the decrypted connection auth.
   */
  [ENDPOINT_TYPES.PAGERDUTY_SERVICE]: { routingKey: string; region: 'us' | 'eu' };
};
```

Mirror in `packages/stateless/src/lib/provider/channel-data.type.ts` (own copy
of `ENDPOINT_TYPES` there), add the `XData` member to the `ChannelData` union,
and append to `ENDPOINT_TYPES_REQUIRING_TOKEN`.

## 2. Partial unique index (`libs/dal/.../channel-endpoint.schema.ts`)

```typescript
channelEndpointSchema.index(
  { _environmentId: 1, subscriberId: 1, integrationIdentifier: 1, type: 1 },
  {
    name: 'unique_pagerduty_service_per_subscriber_integration',
    unique: true,
    partialFilterExpression: { type: ENDPOINT_TYPES.PAGERDUTY_SERVICE },
  }
);
```

## 3. Encryption (`libs/application-generic/src/encryption/encrypt-channel-connection-auth.ts`)

Add each secret field name to `SECURE_AUTH_FIELDS` and (optionally typed) to
`ChannelConnectionAuth`. Non-secret companions (e.g. `region`) stay plaintext.
Spec: assert the encrypted value starts with the novu mask prefix and
round-trips through `decryptChannelConnectionAuth`.

## 4. Stateless provider (`packages/providers/src/lib/tool/<provider>/`)

Key shape (see `pagerduty.provider.ts` for the full version):

```typescript
export class PagerDutyProvider extends BaseProvider implements IToolProvider {
  async sendMessage(options: IToolOptions, bridgeProviderData = {}) {
    const { routingKey, region } = this.resolveRouting(options); // throws if bad
    // ... build payload; dedup below
  }

  private resolveRouting(options: IToolOptions) {
    const { channelData } = options;
    if (!channelData || !isChannelDataOfType(channelData, ENDPOINT_TYPES.PAGERDUTY_SERVICE)) {
      throw new Error('PagerDutyProvider requires channelData of type "pagerduty_service" ...');
    }
    return channelData.endpoint;
  }

  private resolveDedupKey(override: unknown, options: IToolOptions) {
    if (typeof override === 'string' && override) return override;
    const { transactionId, subscriberId, stepId } = options;
    if (!transactionId || !subscriberId || !stepId) return undefined;
    // deterministic hash of the three ids
  }
}
```

`IToolOptions` (stateless) carries `channelData`, `transactionId`,
`subscriberId`, `stepId`. The handler's `buildProvider(_: ICredentials)` just
does `this.provider = new XProvider()`. Keep a `RESERVED_OVERRIDE_KEYS` set so
step overrides can't collide with structural payload fields.

## 5. API DTOs (`apps/api/src/app/channel-endpoints/dtos/`)

- `endpoint-types.dto.ts`: wire-shape DTO with `@Matches(/^[a-zA-Z0-9]{32}$/)`
  on the secret and `@IsIn([...])` on enums.
- `create-channel-endpoint-variants.dto.ts`: `Create<X>EndpointDto extends
  CreateChannelEndpointBaseDto` with `@IsEnum([ENDPOINT_TYPES.X]) type` and
  `@ValidateNested() @Type(() => XEndpointDto) endpoint`. The base DTO already
  has `subscriberId` (required) and `createSubscriberIfMissing?` (optional).
- Controller: add both DTOs to `@ApiExtraModels`, the create DTO to the
  `oneOf` + `discriminator.mapping` of `@ApiBody`, and the wire DTO to the
  response `oneOf`.

## 6. Create usecase transaction shape

```typescript
// connection first, endpoint second; compensate on failure
if (command.type === ENDPOINT_TYPES.PAGERDUTY_SERVICE) {
  return await this.createPagerDutyEndpoint(command, identifier, integration, contextKeys);
}
// inside createPagerDutyEndpoint:
//   createdConnection = channelConnectionRepository.create({
//     ..., workspace: { ...STUB }, auth: encryptChannelConnectionAuth({ routingKey, region }) })
//   endpoint = channelEndpointRepository.create({ ..., connectionIdentifier, endpoint: {} })
//   return { ...endpoint, endpoint: { routingKey, region } }   // hydrate for the response
// catch: delete createdConnection; duplicate-key (code 11000) -> ConflictException(409)
```

`assertSubscriberExists`: if missing and `createSubscriberIfMissing` is falsy,
throw 404 whose message names the flag; otherwise
`CreateOrUpdateSubscriberUseCase.execute({ ..., allowUpdate: false })`.

Update usecase: rotate secret on the connection (re-encrypt), bump endpoint
`updatedAt`, hydrate response. Delete usecase: cascade-delete the connection
via `connectionIdentifier`. Get: hydrate one. List: batch-hydrate with one
`$in` connection query per page.

## 7. Worker

`resolve-channel-endpoints.usecase.ts` — in `extractToken`:

```typescript
if (endpoint.type === ENDPOINT_TYPES.PAGERDUTY_SERVICE) {
  // decrypt linked connection auth, return { endpoint: { routingKey, region } }
  return this.extractPagerDutyAuth(endpoint, connectionMap);
}
```

`send-message-tool.usecase.ts`:

```typescript
export const ENDPOINT_ROUTED_TOOL_PROVIDERS = new Set<string>([ToolProviderIdEnum.PagerDuty]);
// send loop: no channelData for an endpoint-routed provider ->
//   emit execution detail + status SKIPPED, continue.
// credential-routed providers keep the legacy integration.credentials send.
// Pass channelData + transactionId/subscriberId/stepId into provider.send.
```

## 8. Docs page structure (`docs/platform/integrations/tool/<provider>.mdx`)

Mintlify MDX; follow `docs/AGENTS.md`. Required structure (PagerDuty page is
the template):

1. Frontmatter: `title: "{Provider} Tool Integration with Novu"`,
   `sidebarTitle`, `description`.
2. Intro: per-subscriber routing, integration stores no credentials.
3. `<Note>`: no env-level secret; missing endpoint → step **skipped**.
4. Prerequisites; "Get a <secret> from {Provider}" `<Steps>` + `<Warning>`.
5. "Add {Provider} in Novu" (Integrations Store → Tool).
6. "Store a subscriber's <secret>": server-side-only `<Warning>`, mermaid
   sequence diagram (browser → customer backend → Novu API), create example in
   the full SDK tab order (Node.js, Python, Go, PHP, .NET, Java, cURL),
   endpoint-shape table, 409/PATCH rotation, read+mask, DELETE cascade.
7. "Page a subscriber from a workflow": Tool step `<Steps>` + trigger tab set
   + defaults/overrides table (incl. deterministic dedup).
8. "What happens without an endpoint" + Related `<Columns>` cards to
   `/api-reference/channel-endpoints/*`.

Register under the `Tool` group in `docs/docs.json`, then point the provider's
`docReference` in `packages/shared/.../channels/tool.ts` at
`https://docs.novu.co/platform/integrations/tool/<provider>${UTM_CAMPAIGN_QUERY_PARAM}`
and rebuild `@novu/shared`.

## 9. Playground trio (`playground/nextjs`)

- `src/lib/<provider>-endpoint-connect.ts`: server-only helper over raw REST
  (`novuFetch` with `NOVU_SECRET_KEY`). Contract: `ensureXEndpoint` (POST with
  `createSubscriberIfMissing: true`; on 409, list → PATCH = idempotent
  rotate), `listXEndpoints`, `deleteXEndpoint`, client-side format validator.
- `src/pages/api/<provider>-endpoint.ts`: POST/GET/DELETE route = the "acme
  backend"; validates body, resolves integration identifier from body or
  `NOVU_CONNECT_<PROVIDER>_INTEGRATION_IDENTIFIER`.
- `src/components/<provider>-end-user-connect.tsx`: secret form (`useId` for
  input ids, client-side masking `••••XXXX`), endpoint list with disconnect,
  and a trigger-workflow section posting to the shared `/api/trigger-event`
  proxy with `to: { subscriberId }`.
- Clerk-gated page `src/pages/connect-<provider>-end-user/index.tsx` using
  `user.id` as the subscriberId, plus a `SideNav` link and
  `NEXT_PUBLIC_CONNECT_<PROVIDER>_*` entries in `.env.example`.

Playground code is demo-only: never copy it into production apps/packages.
