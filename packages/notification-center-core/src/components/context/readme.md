# context-provider



<!-- Auto Generated Below -->


## Properties

| Property          | Attribute      | Description | Type                      | Default     |
| ----------------- | -------------- | ----------- | ------------------------- | ----------- |
| `STENCIL_CONTEXT` | --             |             | `{ [key: string]: any; }` | `undefined` |
| `contextName`     | `context-name` |             | `string`                  | `undefined` |


## Events

| Event           | Description | Type               |
| --------------- | ----------- | ------------------ |
| `mountConsumer` |             | `CustomEvent<any>` |


## Dependencies

### Used by

 - [notification-center](../notification-center)
 - [notifications-tab](../notifications-tab)
 - [novu-provider](../novu-provider)

### Graph
```mermaid
graph TD;
  notification-center --> stencil-provider
  notifications-tab --> stencil-provider
  novu-provider --> stencil-provider
  style stencil-provider fill:#f9f,stroke:#333,stroke-width:4px
```

----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
